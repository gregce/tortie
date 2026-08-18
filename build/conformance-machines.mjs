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
 * THE THIRTY FOUR CONDITIONS IT FAILS ON. Each one is a way a person's agreement
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
 * 15. The ledger holds any of the four verbs this release refuses, a row carries
 *     an empty reason, or a verb the plane does send is absent from it.
 * 16. `SERVER_OPTIONS` and `resources/gmux-tmux.conf` disagree on any option,
 *     value or scope flag, in either direction; the local re-assert order moved;
 *     or a second row started taking its value from Settings.
 * 17. `TESTED_REMOTE_TMUX_VERSIONS` is empty, a row is missing its measurement
 *     date or its note, or a row claims control mode was measured while the exec
 *     plane was not. Phase 69 and Phase 70 failed on ANY control claim, because
 *     neither release opened a control connection. Phase 71 measures the dialect
 *     with `npm run probe:controldialect` and flips the field for the versions
 *     that matched, so the rule is now that a claim carries its measurement.
 * 18. A golden file has no manifest row, a manifest row names a file that is not
 *     there, or a class listed as having no golden has one or gives no reason.
 * 19. The local attach argv differs by one byte from the golden taken from
 *     `b660df9`, across eight name and server vectors.
 * 20. A remote attach argv does not carry `-t` first, does not carry every
 *     required option, does not carry `-f /dev/null`, does not carry `-u`, names
 *     a bare program rather than the absolute one, carries a literal `gmux`
 *     socket, or targets a name that is not an exact match or is unquoted.
 * 21. The ledger is missing `new-session`, `kill-session` or `rename-session`,
 *     any of the three carries a thin reason or is not marked mutating, or any
 *     of `kill-server`, `attach-session`, `send-keys` or `respawn-pane` left the
 *     refused list.
 * 22. A remote create argv is missing `-d`, is missing `-P -F`, is missing `--`,
 *     or does not carry both `GMUX_MANAGED` and `GMUX_SESSION_ID` as `-e` pairs
 *     on the `new-session` line itself.
 * 23. The remote list format carries a tab, prints a different number of fields
 *     from the one the parse expects, leaves any field outside tmux's own
 *     quoting, or puts a fixed field after a free form one.
 * 24. Any production file under `src/main/machines/` names node-pty other than
 *     `connection-test.ts`, any file under `src/main/machines/` imports anything
 *     under `src/main/attach/`, `attach-plan.ts` imports anything outside its
 *     allowed list, or a second file under `src/main/attach/` names node-pty.
 * 25. The status truth table disagrees with research 51 section 4.4 on any of
 *     its six arms: the status an arm writes, the evidence it records, whether
 *     the arm may produce `restorable`, whether it offers restore, or whether it
 *     says why it does not. Also fails when the table and `mayFlipRestorable`
 *     disagree, when any arm produces `needs_input`, or when
 *     `src/main/machines/status-truth.ts` imports anything but a shared type.
 *     PHASE 72 CHANGED WHAT THIS ARM EXPECTS. Two arms now offer restore, and
 *     they are exactly the two `mayFlipRestorable` names, so the two sets are
 *     compared against each other rather than both held at false.
 * 26. The restore gate offers Restore for an input it should refuse, refuses
 *     with the wrong arm, refuses without a sentence a person could read, or
 *     offers a row that reads `unknown`. Also fails when the declared order of
 *     the arms is not the order they fire in, because the first true arm is the
 *     sentence a person reads, or when `restore-gate.ts` imports anything
 *     beyond a shared type and the copy module.
 * 27. The ten row fault matrix has fewer than ten rows, its two halves name
 *     different rows, or `src/main/harness/index.ts` cannot start it. A row
 *     with no grader passes by not being looked at.
 * 28. The key install hash does not move for `host`, `user`, `port` or the local
 *     key path, each varied alone; it does not carry the file it writes on the
 *     other machine or the record prefix; it carries `remoteTmuxPath`, a label or
 *     a colour; or it equals the machine execution hash for the same machine.
 *     PHASE 79.1 DID NOT ADD A FIELD TO THE MACHINE HASH, and conditions 1, 2
 *     and 7 still hold that set at four. Installing a key is a second act, so it
 *     gets a second agreement over its own facts.
 * 29. The key install argv is missing `BatchMode=no`, `StrictHostKeyChecking=yes`,
 *     `NumberOfPasswordPrompts=1`, `PubkeyAuthentication=no` or
 *     `IdentitiesOnly=yes`; weakens the host key check; or does not name exactly
 *     one record file option with Tortie's file first and both paths quoted.
 * 30. The remote script carries a backtick, a `$(` or a `${`; the remote command
 *     is not the output of one `shellQuoteArgv` call over an argv array; or the
 *     public key is anywhere in that command other than as the last argument.
 * 31. The remote script carries a `>` that is not part of a `>>`, appends at more
 *     than one place, names `truncate`, `tee` or `dd`, or aims its one append at
 *     something other than the `authorized_keys` path it named.
 * 32. A public key line Tortie did not make produces an argv at all. Five hostile
 *     strings are tried, being a second line, a semicolon, a backtick pair, a
 *     command substitution and a single quote.
 * 33. `key-material.ts` names `homedir`, `~` or `.ssh` outside a denying comment;
 *     the key directory is outside the machine record directory; a hostile
 *     machine id composes a path outside the key directory, a file name that is
 *     not a hash, or a key comment that is not a hash; or twelve ids produce
 *     fewer than twelve file names.
 * 34. `key-material.ts`, `key-install.ts` or `connection-test.ts` imports the
 *     manifest or the sealed confirmation record, or names `safeStorage` in code.
 *     The password a person types crosses one call and is kept nowhere, and this
 *     is the condition that makes that a property of the import graph.
 *
 * WHAT IT DOES NOT PROVE, stated so nobody reads more into a pass. The record
 * is sealed through `safeStorage`, which needs an Electron process, so this
 * gate never watches a confirmed machine pass and an unconfirmed one refuse.
 * That is `npm run smoke:machines`. It also connects to nothing: no ssh runs,
 * no remote tmux is started and no version is measured. Conditions 11 to 18 read
 * COMPOSED strings and lists, never a live connection, so what they prove is that
 * the shapes are right and not that a machine answered. That is
 * `build/probe-execplane.mjs` and `npm run smoke:execplane`.
 *
 * Conditions 28 to 34 read composed strings and source files. No key is made, no
 * password is typed and nothing is written to any machine. That is
 * `npm run probe:keyinstall`, which drives the real client and a real scratch
 * server on 127.0.0.1.
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
  'prepared',
  // Phase 79.1. Tortie's own answer after it put a key on a machine. No program
  // prints it, which is why the golden manifest carries a `noGolden` row for it
  // with that reason. The surface then starts the real connection test, so this
  // class is never the last thing a person reads.
  'key-installed',
  // Phase 79.1 fix round. A machine that answered and asked for a password. A
  // real program prints that question and the golden folder holds the bytes,
  // captured through Tortie's own runner because the question arrives while the
  // client is still running and the capture script runs every case to an exit.
  'password-required'
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
    `"${String(forbidden)}" is on the remote verb ledger. It is refused because ` +
      `nobody has written down why running it twice is safe, and the ledger is ` +
      `what enforces that in code rather than in prose. A later rung may add it ` +
      `WITH its repeat reasoning, which is what Phase 70 did for new-session, ` +
      `kill-session and rename-session. attach-session is the exception and it ` +
      `is refused forever.`
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
  // PHASE 71 CHANGED THIS CHECK, and the change is the whole shape of the
  // ladder. Phase 69 and Phase 70 failed on any row claiming control mode was
  // measured, because neither release opened a control connection and a claim
  // nothing could have measured is a claim nobody should trust. Phase 71 runs
  // `npm run probe:controldialect` against a real remote tmux and flips the
  // field for a version whose stream matched the local control child. So the
  // rule is no longer "nobody may claim it". It is "a claim carries its
  // measurement", which is the date and the note every row already owes.
  if (row.control === true && row.exec !== true) {
    fail(
      `the row for ${String(row.version)} claims control mode was measured and ` +
        `the exec plane was not. The dialect probe compares a remote control ` +
        `stream against the local child over an exec plane that is already ` +
        `working, so this pair cannot have happened.`
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
// 19. The local attach argv, byte for byte against b660df9
// ---------------------------------------------------------------------------
//
// 61 sessions on the author's machine attach through this one composer, so one
// wrong byte is one wrong byte in every one of them.

const attachLocalRows = data.attachLocalRows ?? [];
if (attachLocalRows.length < 8) {
  fail(
    `the local attach argv was compared on ${String(
      attachLocalRows.length
    )} name(s) and the gate wants at least eight. The composition moved out of ` +
      `the file that holds the terminal binding in this phase, and this is what ` +
      `says it moved unchanged.`
  );
}
for (const row of attachLocalRows) {
  if (row.equal) continue;
  fail(
    `the local attach argv for ${JSON.stringify(row.name)} differs from what ` +
      `b660df9 composed.\n      want ${String(row.wantFile)} ${JSON.stringify(
        row.want
      )}\n      got  ${String(row.file)} ${JSON.stringify(row.got)}`
  );
}

// ---------------------------------------------------------------------------
// 20. The remote attach argv
// ---------------------------------------------------------------------------

const attachRemoteArgv = (data.attachRemoteArgv ?? []).map(String);
const attachRemoteLast = String(attachRemoteArgv[attachRemoteArgv.length - 1] ?? '');

if (attachRemoteArgv[0] !== '-t') {
  fail(
    `the remote attach argv begins with ${JSON.stringify(
      attachRemoteArgv[0] ?? null
    )} rather than -t. Without -t the sign in program gives the remote command ` +
      `no terminal at all and tmux refuses to attach.`
  );
}
if (String(data.attachRemoteFile) !== String(data.attachRemoteSshBin)) {
  fail(
    `a remote attach runs ${JSON.stringify(
      String(data.attachRemoteFile)
    )} rather than the sign in program the context resolved.`
  );
}
for (const required of data.requiredSshOptions ?? []) {
  if (attachRemoteArgv.join(' ').includes(String(required))) continue;
  fail(
    `the remote attach argv is missing ${String(required)}. An attach is the ` +
      `longest lived connection Tortie makes, so a dropped keepalive there is a ` +
      `pane that hangs rather than a link that ends.`
  );
}
if (!attachRemoteLast.includes('-f /dev/null')) {
  fail(
    `the remote attach does not carry -f /dev/null. Any verb can create a ` +
      `server, and a server created without it reads that machine's own ` +
      `configuration file.`
  );
}
if (!/(^|\s)-u(\s|$)/.test(attachRemoteLast)) {
  fail(
    `the remote attach does not carry -u, so tmux classifies the client as ` +
      `something other than UTF-8 and draws an underscore for every non-ASCII ` +
      `cell. That is Bug C from Phase 9.2, on a second kind of client.`
  );
}
if (!attachRemoteLast.includes('attach-session')) {
  fail('the remote attach does not carry attach-session.');
}
if (!attachRemoteLast.startsWith(String(data.attachRemoteProgram))) {
  fail(
    `the remote attach runs ${JSON.stringify(
      attachRemoteLast.split(' ')[0] ?? ''
    )} on the far side rather than the absolute program the confirm hash bound. ` +
      `A bare name would let the other machine's PATH choose which program runs.`
  );
}
if (attachRemoteArgv.some((one) => one === data.realSocket)) {
  fail(
    `the remote attach argv carries the literal socket "${String(
      data.realSocket
    )}". The socket must come from the machine context and from nowhere else.`
  );
}
if (!attachRemoteLast.includes(`-L ${String(data.probeSocket)}`)) {
  fail(
    `the remote attach does not name the socket the context carried as the ` +
      `value of -L.`
  );
}
{
  // The target is the last thing on the line and it is an exact match. A bare
  // name matches on a prefix, and a prefix match on another machine would stream
  // a stranger's session into the person's tab.
  const target = attachRemoteLast.slice(attachRemoteLast.lastIndexOf('-t ') + 3);
  const bare = target.replace(/^'/, '').replace(/'$/, '');
  if (!bare.startsWith('=')) {
    fail(
      `the remote attach targets ${JSON.stringify(target)}, which is not an ` +
        `exact match. A bare name matches on a prefix.`
    );
  }
  if (target === bare) {
    fail(
      `the remote attach target ${JSON.stringify(target)} is unquoted. MEASURED ` +
        `2026-08-17: zsh expands a word beginning with = into a program path, so ` +
        `an unquoted exact-match target never reaches tmux.`
    );
  }
}

// ---------------------------------------------------------------------------
// 21. The three verbs Phase 70 added, and the four that stay refused
// ---------------------------------------------------------------------------

for (const verb of ['new-session', 'kill-session', 'rename-session']) {
  const row = ledger.find((one) => one.verb === verb);
  if (row === undefined) {
    fail(
      `"${verb}" is sent by this release and is not on the ledger, so the plane ` +
        `would refuse its own commands.`
    );
    continue;
  }
  if (Number(row.reasonLength) < 40) {
    fail(
      `the ledger row for "${verb}" says almost nothing about why running it ` +
        `twice is safe. A machine can sleep after it ran a command and before ` +
        `the reply arrives, so that reasoning is the whole reason the row exists.`
    );
  }
  if (row.kind !== 'mutating') {
    fail(
      `the ledger row for "${verb}" is ${JSON.stringify(row.kind)} rather than ` +
        `mutating, so it would be sent before the machine's own program search ` +
        `list had been read.`
    );
  }
}
const STILL_REFUSED = ['kill-server', 'attach-session', 'send-keys', 'respawn-pane'];
for (const verb of STILL_REFUSED) {
  if ((data.forbiddenVerbs ?? []).includes(verb)) continue;
  fail(
    `"${verb}" left the refused list. attach-session in particular is refused ` +
      `forever: attach is a different plane with a different carriage, and a ` +
      `person's keystrokes must never be reachable through a one-shot exec.`
  );
}

// ---------------------------------------------------------------------------
// 22. The remote create argv
// ---------------------------------------------------------------------------

const createArgv = (data.remoteCreateArgv ?? []).map(String);
if (createArgv[0] !== 'new-session') {
  fail(`the remote create begins with ${JSON.stringify(createArgv[0] ?? null)}.`);
}
if (!createArgv.includes('-d')) {
  fail(
    'the remote create is missing -d, so it would attach a client on the far ' +
      'side that nobody asked for and nobody can see.'
  );
}
if (!createArgv.includes('-P') || !createArgv.includes('-F')) {
  fail(
    'the remote create is missing -P -F, so the immutable identifier would have ' +
      'to be found by a list afterwards, and that list is a race a second create ' +
      'can win.'
  );
}
{
  const pairs = createArgv.filter((_, index) => createArgv[index - 1] === '-e');
  const carries = (name) => pairs.some((one) => one.startsWith(`${name}=`));
  if (!carries('GMUX_MANAGED') || !carries('GMUX_SESSION_ID')) {
    fail(
      `the remote create carries ${JSON.stringify(pairs)} as -e pairs and it ` +
        `must carry both GMUX_MANAGED and GMUX_SESSION_ID on the new-session ` +
        `line itself. That is what makes a create whose answer was lost ` +
        `identifiable rather than a session nobody can account for.`
    );
  }
}
if (!createArgv.includes('--')) {
  fail(
    'the remote create does not separate the command with --, so an agent flag ' +
      'that looks like a tmux flag would be read by tmux.'
  );
}

// ---------------------------------------------------------------------------
// 23. The list format
// ---------------------------------------------------------------------------
//
// MEASURED 2026-08-17 with tmux 3.6a, which is why this condition asks what it
// asks rather than what research 51 section 4.3 drafted:
//
//   env -i tmux -f /dev/null new-session -d -P -F '#{session_id}<TAB>#{session_name}'
//     printed  $0_p70 tabtest
//   env -i LC_ALL=en_US.UTF-8 tmux -f /dev/null new-session -d -P -F '...'
//     printed  $0<TAB>p70 tabtest
//
// A tab in a format comes back as an underscore when the client has no UTF-8
// locale, and a command sent over a connection has no locale unless both sides
// were configured to forward one. So the separator is a single space and every
// field is wrapped in tmux's own `#{q:...}` quoting, which is printable ASCII
// whatever the locale is.

const listFormat = String(data.remoteListFormat ?? '');
const listFields = listFormat.split(' ');
if (listFormat.includes('\t')) {
  fail(
    'the remote list format carries a tab. A tab comes back as an underscore ' +
      'from a client with no UTF-8 locale, and a command sent over a connection ' +
      'has none, so every field after it would move.'
  );
}
if (listFields.length !== Number(data.remoteListFields)) {
  fail(
    `the remote list format prints ${String(listFields.length)} field(s) and ` +
      `the parse expects ${String(data.remoteListFields)}. A row that does not ` +
      `split into exactly that many is dropped, so a mismatch drops every row.`
  );
}
for (const field of listFields) {
  if (field.startsWith('#{q:')) continue;
  fail(
    `the remote list field ${JSON.stringify(field)} is not wrapped in tmux's ` +
      `own quoting. The separator is a space, so a value holding a space would ` +
      `become two fields and the whole row would be dropped.`
  );
}
{
  const freeForm = (data.remoteListFreeForm ?? []).map(String);
  const firstFree = listFields.findIndex((one) => freeForm.includes(one));
  const tail = firstFree < 0 ? [] : listFields.slice(firstFree);
  if (firstFree < 0 || !tail.every((one) => freeForm.includes(one))) {
    fail(
      `the remote list format puts a fixed field after a free-form one: ` +
        `${JSON.stringify(listFields)}. With every field quoted that is no ` +
        `longer load bearing, and it is kept because a reader should not have ` +
        `to know about the quoting to see that the format is safe.`
    );
  }
}
if (String(data.remoteCreateFormat ?? '') !== '#{session_id}') {
  fail(
    `the remote create format is ${JSON.stringify(
      String(data.remoteCreateFormat ?? '')
    )} and it must ask for the immutable identifier and nothing else. One field ` +
      `means there is no separator to get wrong.`
  );
}

// ---------------------------------------------------------------------------
// 24. The node-pty containment rule
// ---------------------------------------------------------------------------
//
// Phase 69 found that reading one constant across this boundary put node-pty
// into the import graph of the manifest store, and `contract-inventory --check`
// crashed rather than diffed. This rung adds a remote attach, so it is exactly
// the rung that can undo that.

for (const hit of data.machinePtyMentions ?? []) {
  if (hit.file === data.ptyOwnerFile) continue;
  if (isDenyingComment(hit.text)) continue;
  fail(
    `${hit.file}:${hit.line} names node-pty and only ${String(
      data.ptyOwnerFile
    )} may. A second importer under src/main/machines/ puts a native module ` +
      `into the import graph of everything that reads a constant from there. ` +
      `The line reads: ${hit.text}`
  );
}
for (const hit of data.machineAttachImports ?? []) {
  fail(
    `${hit.file}:${hit.line} imports from src/main/attach/. The dependency runs ` +
      `the other way: attach reads the machine context, and nothing under ` +
      `machines may reach back. The line reads: ${hit.text}`
  );
}
{
  const planImports = (data.attachPlanSource ?? []).map(String);
  const ALLOWED_PLAN_IMPORTS = [
    '../machines/context',
    '../machines/ssh',
    '../restore/command',
    'node:path'
  ];
  for (const line of planImports) {
    const match = /'([^']+)'/.exec(line);
    if (match === null) continue;
    if (ALLOWED_PLAN_IMPORTS.includes(match[1])) continue;
    fail(
      `src/main/attach/attach-plan.ts imports ${JSON.stringify(
        match[1]
      )}, which is not on its allowed list. The pure composer must start ` +
        `nothing and load no native module, because it is the file a reviewer ` +
        `reads to learn what Tortie sends to another machine.`
    );
  }
}
{
  const ptyOwners = (data.attachPtyMentions ?? [])
    .filter((hit) => !isDenyingComment(hit.text))
    .map((hit) => hit.file);
  const unique = [...new Set(ptyOwners)];
  const allowed = ['src/main/attach/attach-host.ts'];
  for (const file of unique) {
    if (allowed.includes(file)) continue;
    fail(
      `${file} names node-pty and only ${allowed.join(
        ', '
      )} may under src/main/attach/. The composer and the host are separate so ` +
        `the terminal binding has exactly one home.`
    );
  }
}

// ---------------------------------------------------------------------------
// 25. The status truth table, against research 51 section 4.4
// ---------------------------------------------------------------------------
//
// The expected table is WRITTEN OUT HERE rather than imported, on purpose, for
// the same reason the local golden argv is: importing the implementation and
// comparing it against itself would pass whatever the implementation did. This
// is the transcription of research 51 section 4.4, and a reader compares these
// six rows against that section line by line.
//
// The one rule under all six: a machine Tortie cannot see produces `unknown`.
// It never produces `restorable`, and it never produces `exited`. "The link
// failed" and "a completed list did not report that session" are different
// facts, and reading the first as the second offers Restore over an agent that
// is still working.

const TRUTH_AT_RESEARCH_51 = [
  { event: 'listed', rows: 'per-row', mayFlipRestorable: false, evidence: 'reconcile pass at' },
  { event: 'absent', rows: 'restorable', mayFlipRestorable: true, evidence: 'absent from the pass at' },
  { event: 'transport-lost', rows: 'unknown', mayFlipRestorable: false, evidence: 'transport timed-out at' },
  { event: 'woke', rows: 'unknown', mayFlipRestorable: false, evidence: 'power event at' },
  { event: 'no-server', rows: 'restorable', mayFlipRestorable: true, evidence: 'no server on a reachable machine at' },
  { event: 'control-exit', rows: 'per-row', mayFlipRestorable: false, evidence: 'control event at' }
];

const truthRows = data.truthRows ?? [];
const truthVerdicts = [];

if (truthRows.length !== TRUTH_AT_RESEARCH_51.length) {
  fail(
    `the status truth table has ${String(truthRows.length)} arm(s) and research ` +
      `51 section 4.4 has ${String(TRUTH_AT_RESEARCH_51.length)}. An arm added ` +
      `without a row here is an arm nobody compared against the research.`
  );
}

for (const want of TRUTH_AT_RESEARCH_51) {
  const got = truthRows.find((row) => row.event === want.event) ?? null;
  if (got === null) {
    fail(
      `the status truth table has no arm for "${want.event}", which research 51 ` +
        `section 4.4 lists.`
    );
    continue;
  }
  const problems = [];
  if (got.rows !== want.rows) {
    problems.push(`rows ${JSON.stringify(got.rows)} rather than ${JSON.stringify(want.rows)}`);
  }
  if (got.mayFlipRestorable !== want.mayFlipRestorable) {
    problems.push(
      `mayFlipRestorable ${String(got.mayFlipRestorable)} rather than ` +
        `${String(want.mayFlipRestorable)}`
    );
  }
  if (!String(got.evidence).startsWith(want.evidence)) {
    problems.push(
      `evidence ${JSON.stringify(got.evidence)} rather than one beginning ` +
        `${JSON.stringify(want.evidence)}`
    );
  }
  if (!String(got.evidence).includes(String(data.truthAt))) {
    problems.push('evidence carrying no instant, so a log line cannot be placed in time');
  }
  // PHASE 72. Two arms now offer restore, and they are exactly the two that
  // `mayFlipRestorable` names. The rule is one sentence: a session may be
  // offered for restore only when the machine ANSWERED and the answer did not
  // hold it. An arm that offers restore on any other evidence is offering to
  // start a second agent on a conversation that already has one, so the two
  // sets are compared here rather than read.
  if (got.restoreOffered !== want.mayFlipRestorable) {
    problems.push(
      `restoreOffered ${String(got.restoreOffered)} for an arm whose ` +
        `mayFlipRestorable is ${String(want.mayFlipRestorable)}. Restore is ` +
        `offered on exactly the arms where a machine answered and its answer ` +
        `did not hold the session.`
    );
  }
  if (got.restoreOffered === true && got.reason !== null) {
    problems.push(
      'an arm that offers restore also carries a sentence saying why it does ' +
        'not, so a surface could draw both'
    );
  }
  if (got.restoreOffered === false) {
    if (typeof got.reason !== 'string' || got.reason.length < 20) {
      problems.push('no sentence saying why restore is not offered');
    }
    if (
      String(got.reason ?? '').includes('—') ||
      String(got.reason ?? '').includes('–')
    ) {
      problems.push('a dash the writing rules refuse');
    }
  }
  if (problems.length > 0) {
    fail(`the "${want.event}" arm of the status truth table: ${problems.join('; ')}.`);
  }
  truthVerdicts.push({
    event: want.event,
    rows: got.rows,
    restorable: got.mayFlipRestorable ? 'yes' : 'no',
    verdict: problems.length === 0 ? 'pass' : 'FAIL'
  });
}

// The two halves have to agree: every arm that WRITES restorable is an arm the
// guard admits. A later edit that gave a lost link the power to write a
// confirmed death would have to break both to get past this.
for (const row of truthRows) {
  const writes = row.rows === 'restorable';
  if (writes === row.mayFlipRestorable) continue;
  fail(
    `the "${String(row.event)}" arm writes ${JSON.stringify(row.rows)} and ` +
      `mayFlipRestorable answers ${String(row.mayFlipRestorable)}. The guard and ` +
      `the table are the same rule and they disagree.`
  );
}

// No arm may produce a status that means the session is asking for a person.
// Status semantics do not move: `needs_input` is produced by an oracle reading
// local disk, and a fact about a machine is never that.
for (const row of truthRows) {
  if (row.rows !== 'needs_input') continue;
  fail(
    `the "${String(row.event)}" arm produces needs_input. A machine level fact ` +
      `is never a session behaviour status.`
  );
}

// The module that holds the table has to stay a leaf. It is the file a reviewer
// reads to learn what Tortie believes about a machine it cannot see, and a
// tmux, SQLite or filesystem import in it would mean the answer depends on
// something the reviewer cannot see from the page.
{
  // PHASE 72 ADDED ONE NAME TO THIS LIST. The case table's sentences are copy,
  // and every sentence about a machine is written once in `./remote-copy.ts` so
  // one audit can read them all. That module imports nothing itself, so the
  // rule this list exists for is unchanged: the verdict is still decidable from
  // the event alone, with no tmux, no SQLite, no filesystem and no timer.
  const ALLOWED_TRUTH_IMPORTS = ['@shared/types', './remote-copy'];
  for (const line of (data.truthImports ?? []).map(String)) {
    const match = /'([^']+)'/.exec(line);
    if (match === null) continue;
    if (ALLOWED_TRUTH_IMPORTS.includes(match[1])) continue;
    fail(
      `src/main/machines/status-truth.ts imports ${JSON.stringify(
        match[1]
      )}, which is not on its allowed list. The case table must be decidable ` +
        `from the event alone: no tmux, no SQLite, no filesystem and no timer.`
    );
  }
}

// ---------------------------------------------------------------------------
// 26. Phase 72. The gate that decides whether Restore is offered
// ---------------------------------------------------------------------------
//
// Pressing Restore when the answer should have been no is how one conversation
// comes to have two agents on it. The gate is pure, so the probe drives it from
// a baseline where every condition holds, turning one condition off at a time,
// and what is checked here is which arm each of those reaches.
//
// The expected arms are written out HERE rather than imported, for the same
// reason the case table above is: importing the implementation and comparing it
// against itself would pass whatever the implementation did.

const GATE_AT_SPEC = [
  { name: 'everything holds', offered: true, refusal: null },
  { name: 'the machine was removed', offered: false, refusal: 'forgotten' },
  { name: 'the row belongs to another machine', offered: false, refusal: 'wrong-machine' },
  { name: 'nobody signed in to it in this run', offered: false, refusal: 'not-ready' },
  { name: 'neither route to the machine answered', offered: false, refusal: 'no-route' },
  { name: 'that machine’s own session server has died', offered: true, refusal: null },
  { name: 'no list has completed yet', offered: false, refusal: 'unseen' },
  { name: 'the machine is not answering now', offered: false, refusal: 'unseen' },
  { name: 'the machine still lists the session', offered: false, refusal: 'running' },
  { name: 'the row reads unknown', offered: false, refusal: 'unseen' },
  { name: 'the row reads unknown and every condition holds', offered: false, refusal: 'unseen' },
  { name: 'the row is running', offered: false, refusal: 'running' }
];

const REFUSAL_ORDER = [
  'forgotten',
  'wrong-machine',
  'not-ready',
  'no-route',
  'unseen',
  'running'
];

const gateRows = data.gateRows ?? [];
const gateVerdicts = [];

if (gateRows.length !== GATE_AT_SPEC.length) {
  fail(
    `the restore gate was driven over ${String(gateRows.length)} input(s) and ` +
      `${String(GATE_AT_SPEC.length)} are named here. An input added without a ` +
      `row here is an input nobody compared against the specification.`
  );
}

for (const want of GATE_AT_SPEC) {
  const got = gateRows.find((row) => row.name === want.name) ?? null;
  if (got === null) {
    fail(`the restore gate was not driven with "${want.name}"`);
    continue;
  }
  const problems = [];
  if (got.offered !== want.offered) {
    problems.push(
      `offered ${String(got.offered)} rather than ${String(want.offered)}`
    );
  }
  if ((got.refusal ?? null) !== want.refusal) {
    problems.push(
      `refusal ${JSON.stringify(got.refusal)} rather than ` +
        `${JSON.stringify(want.refusal)}`
    );
  }
  if (want.offered === false) {
    if (typeof got.reason !== 'string' || got.reason.length < 20) {
      problems.push('no sentence a person could read');
    }
    if (String(got.reason ?? '').includes('—') || String(got.reason ?? '').includes('–')) {
      problems.push('a dash the writing rules refuse');
    }
  } else if (String(got.reason ?? '') !== '') {
    problems.push('an offered verdict carries a refusal sentence as well');
  }
  if (problems.length > 0) {
    fail(`the restore gate with "${want.name}": ${problems.join('; ')}.`);
  }
  gateVerdicts.push({
    input: want.name,
    offered: got.offered ? 'YES' : 'no',
    refusal: got.refusal ?? '',
    verdict: problems.length === 0 ? 'pass' : 'FAIL'
  });
}

// A row that reads `unknown` can never be offered, whatever else is true. It is
// asserted over every input rather than over the two that name it, because the
// status is the one fact a surface shows and a person reads.
for (const row of gateRows) {
  if (row.rowStatus !== 'unknown' || row.offered !== true) continue;
  fail(
    `the restore gate offered a row reading unknown, with "${String(row.name)}". ` +
      `A machine Tortie cannot see says nothing about the session, so there is ` +
      `nothing there to bring back.`
  );
}

// The declared order and the order the arms actually fire in are the same rule,
// and a person reads the FIRST one that is true. A declared order that no
// longer matches the code means the sentence a person reads is not the one the
// author chose.
{
  const declared = (data.gateRefusals ?? []).map(String);
  if (JSON.stringify(declared) !== JSON.stringify(REFUSAL_ORDER)) {
    fail(
      `the restore gate declares its arms in the order ${declared.join(', ')} ` +
        `and the specification's order is ${REFUSAL_ORDER.join(', ')}. The ` +
        `first true arm is the sentence a person reads.`
    );
  }
}

// The gate has to be decidable from its facts alone. A tmux, SQLite or
// filesystem import in it would mean the answer depends on something a reviewer
// cannot see from the page.
{
  const ALLOWED_GATE_IMPORTS = ['@shared/types', './remote-copy'];
  for (const line of (data.gateImports ?? []).map(String)) {
    const match = /'([^']+)'/.exec(line);
    if (match === null) continue;
    if (ALLOWED_GATE_IMPORTS.includes(match[1])) continue;
    fail(
      `src/main/machines/restore-gate.ts imports ${JSON.stringify(
        match[1]
      )}, which is not on its allowed list. The verdict must be decidable from ` +
        `the facts alone: no tmux, no SQLite, no filesystem and no timer.`
    );
  }
}

// ---------------------------------------------------------------------------
// 27. Phase 72. The ten row fault matrix still has ten rows
// ---------------------------------------------------------------------------
//
// The matrix is the gate on remote restore. A matrix that quietly lost a row
// would still print PASS over the rows it kept, and nothing else in the
// repository would notice. This costs a text scan.

{
  const appRows = (data.matrixAppRows ?? []).map(String).sort();
  const supervisorRows = (data.matrixSupervisorRows ?? []).map(String).sort();
  if (appRows.length !== 10) {
    fail(
      `src/main/harness/remote-matrix.ts produces ${String(
        appRows.length
      )} row(s) and research 28 section 6.3 has 10.`
    );
  }
  if (JSON.stringify(appRows) !== JSON.stringify(supervisorRows)) {
    fail(
      `the two halves of the fault matrix name different rows. The app half ` +
        `has ${appRows.join(', ')} and build/remote-matrix.mjs grades ` +
        `${supervisorRows.join(', ')}. A row with no grader passes by not being ` +
        `looked at.`
    );
  }
  if (data.matrixModeRegistered !== true) {
    fail(
      `src/main/harness/index.ts does not dispatch the remote-matrix mode, so ` +
        `nothing can start the matrix at all.`
    );
  }
}

// ---------------------------------------------------------------------------
// 28 to 34. Phase 79.1. Tortie makes the key and puts it on the machine
// ---------------------------------------------------------------------------
//
// Installing a key is a second act and it gets a second agreement. The machine
// execution hash did NOT gain a field for it, so conditions 1, 2 and 7 above
// still hold that set at four and every machine the operator already confirmed
// still reads `confirmed`. What is checked here is the other half of that
// choice: the install has its own hash over the facts its own sheet shows, the
// two hashes are never one value, and nothing a person or an agent typed can
// reach the other machine's shell.

const keyVerdicts = [];
const key = data.keyInstall ?? {};

{
  // 28. The install agreement, and what it is bound to.
  if (typeof key.base !== 'string' || key.base.length !== 64) {
    fail(
      `the key install sheet hashed to ${JSON.stringify(key.base)}. There is ` +
        `nothing for a person's agreement to bind to, so the install would run ` +
        `on whatever the renderer sent.`
    );
  }
  if (key.sameAgain !== key.base) {
    fail('hashing the same key install twice gave two answers. No agreement would hold.');
  }
  if (key.base === key.machineHash) {
    fail(
      'the key install hash and the machine execution hash are the same value. ' +
        'One agreement would cover two different acts, and the sheet a person ' +
        'read for one would confirm the other.'
    );
  }
  for (const row of key.fields ?? []) {
    const moved = row.changedHash !== key.base;
    const unsetMoved = row.unsetHash === null || row.unsetHash !== key.base;
    if (!moved) {
      fail(
        `changing ${row.field} left the key install hash unchanged, so a sheet ` +
          `read for one machine, one account or one key file would install on ` +
          `another.`
      );
    }
    if (!unsetMoved) {
      fail(
        `unsetting ${row.field} left the key install hash unchanged. Removing a ` +
          `value changes where the key lands exactly as much as replacing it does.`
      );
    }
    keyVerdicts.push({
      field: row.field,
      moves: moved && unsetMoved ? 'yes' : 'NO',
      verdict: moved && unsetMoved ? 'pass' : 'FAIL'
    });
  }
  if (!key.canonicalCarriesRemotePath) {
    fail(
      `the key install hash text does not carry the file it writes on the other ` +
        `machine, ${String(key.remoteFilePath)}. That path is the single most ` +
        `important fact on the sheet, so it has to be inside the hash and not ` +
        `beside it.`
    );
  }
  if (!key.canonicalCarriesLocalKeyPath) {
    fail(
      'the key install hash text does not carry the local path of the private ' +
        'half. A person is told where the key stays, so that is a fact they are ' +
        'agreeing to.'
    );
  }
  if (!key.canonicalCarriesPrefix) {
    fail(
      'the key install hash text does not carry the record prefix, so a machine ' +
        'and a configured agent with the same bare id would hash against the ' +
        'same id entry.'
    );
  }
  if (key.canonicalCarriesProgramPath) {
    fail(
      'the key install hash text carries the remote program path. It is not in ' +
        'this hash on purpose: a machine that has never authenticated has no ' +
        'program path, and that is the exact machine this surface exists for.'
    );
  }
  if (key.canonicalCarriesLabel || key.canonicalCarriesColor) {
    fail(
      'the key install hash text carries a presentation field, so renaming a ' +
        'machine would ask a person to agree again to an install that did not move.'
    );
  }
  keyVerdicts.push({
    field: 'remote file path',
    moves: key.canonicalCarriesRemotePath ? 'yes' : 'NO',
    verdict: key.canonicalCarriesRemotePath ? 'pass' : 'FAIL'
  });
  keyVerdicts.push({
    field: 'remoteTmuxPath',
    moves: key.canonicalCarriesProgramPath ? 'YES' : 'no',
    verdict: key.canonicalCarriesProgramPath ? 'FAIL' : 'pass'
  });
}

{
  // 29. The install argv.
  const argv = (key.argv ?? []).map(String);
  const REQUIRED = [
    'BatchMode=no',
    'StrictHostKeyChecking=yes',
    'NumberOfPasswordPrompts=1',
    'PubkeyAuthentication=no',
    'IdentitiesOnly=yes'
  ];
  const WHY = {
    'BatchMode=no':
      'the person cannot be asked for the password at all, so the install can ' +
      'never happen',
    'StrictHostKeyChecking=yes':
      'the install could make first contact with an unknown machine, and first ' +
      'contact belongs to the one visible test where a person can read the question',
    'NumberOfPasswordPrompts=1':
      'the client would keep asking after a wrong password, which is the silent ' +
      'retry this phase refuses',
    'PubkeyAuthentication=no':
      'the install could quietly succeed on some other credential, which would ' +
      'make the sentence on the screen about using a password untrue',
    'IdentitiesOnly=yes':
      "Tortie would offer the person's own identities to a machine on this path"
  };
  for (const option of REQUIRED) {
    if (argv.includes(option)) continue;
    fail(`the key install argv does not carry ${option}. Without it ${WHY[option]}.`);
  }
  if (argv.includes('BatchMode=yes')) {
    fail(
      'the key install argv carries BatchMode=yes, which would stop the person ' +
        'answering the one prompt the whole flow depends on.'
    );
  }
  if (argv.includes('StrictHostKeyChecking=ask') || argv.includes('StrictHostKeyChecking=no')) {
    fail(
      'the key install argv weakens the host key check. An install must never ' +
        'meet a machine for the first time, because it would put a question on a ' +
        'surface with no answer field.'
    );
  }
  const keyKnownHosts = argv.filter((a) => a.startsWith(`${data.knownHostsOption}=`));
  const value = String(keyKnownHosts[0] ?? '');
  const tortieFirst = value.indexOf(data.hostKeys.tortie);
  const userSecond = value.indexOf(data.hostKeys.user);
  if (keyKnownHosts.length !== 1) {
    fail(
      `the key install argv names ${keyKnownHosts.length} record file option(s) ` +
        `and it must name exactly one. With none the client picks the file in the ` +
        `person's home folder and writes into it.`
    );
  } else if (tortieFirst < 0 || userSecond < 0) {
    fail(
      'the key install argv does not name both identity record files. Tortie ' +
        "owns the first one, and the person's own is read so a machine they have " +
        'known for years still raises the alarm if its identity changed.'
    );
  } else if (tortieFirst > userSecond) {
    fail(
      "the key install argv names the person's own record file before the file " +
        'Tortie owns. The client adds a new key to the first file in the list.'
    );
  }
  if (
    !value.includes(`"${data.hostKeys.tortie}"`) ||
    !value.includes(`"${data.hostKeys.user}"`)
  ) {
    fail(
      'a path in the key install record file option is unquoted. The client ' +
        "reads that value as a list separated by spaces, and Tortie's own " +
        'directory has a space in its name on every Mac.'
    );
  }
}

{
  // 30. One quoting call, over a list, and the key travels as an argument.
  const script = String(key.script ?? '');
  for (const forbidden of ['`', '$(', '${']) {
    if (!script.includes(forbidden)) continue;
    fail(
      `the remote script carries ${JSON.stringify(forbidden)}. The script is a ` +
        `constant with no interpolation of any kind, and every one of those is a ` +
        `way for a value to become script text on the other machine.`
    );
  }
  if (key.command !== key.commandRecomposed) {
    fail(
      `the remote command is not the output of one shellQuoteArgv call over an ` +
        `argv array.\n      composed    ${JSON.stringify(key.command)}\n` +
        `      recomposed  ${JSON.stringify(key.commandRecomposed)}`
    );
  }
  if (key.scriptCarriesKey) {
    fail(
      'the public key is inside the script text. It must reach the other ' +
        "machine's shell as a positional argument and never as script."
    );
  }
  if (key.commandKeyOccurrences !== 1) {
    fail(
      `the public key appears ${String(key.commandKeyOccurrences)} time(s) in ` +
        `the remote command and it must appear exactly once, as the last argument.`
    );
  }
  if (!key.commandEndsWithQuotedKey) {
    fail(
      'the remote command does not end with the quoted public key, so the key is ' +
        'not the last argv element. Anywhere else in the command is a place the ' +
        "other machine's shell reads it."
    );
  }
}

{
  // 31. Append, never overwrite, and it is a property of the text.
  const script = String(key.script ?? '');
  const withoutAppend = script.split('>>').join('');
  if (withoutAppend.includes('>')) {
    fail(
      `the remote script carries a > that is not part of a >>. The promise never ` +
        `to overwrite an existing authorized_keys is a property of this text, not ` +
        `of a guard around it.`
    );
  }
  const appends = (script.match(/>>/g) ?? []).length;
  if (appends !== 1) {
    fail(
      `the remote script appends at ${String(appends)} place(s) and it must ` +
        `append at exactly one.`
    );
  }
  for (const program of ['truncate', 'tee', 'dd ']) {
    if (!script.includes(program)) continue;
    fail(
      `the remote script names ${program.trim()}, which can replace a file the ` +
        `person already had.`
    );
  }
  if (!script.includes('authorized_keys')) {
    fail('the remote script does not name authorized_keys, so it writes somewhere else.');
  } else {
    const assigned = /(\w+)="\$\w+\/authorized_keys"/.exec(script);
    const target = assigned === null ? null : `>> "$${assigned[1]}"`;
    if (target === null) {
      fail(
        'the remote script does not assign the authorized_keys path to a shell ' +
          'variable, so the gate cannot tell what the append is aimed at.'
      );
    } else if (!script.includes(target)) {
      fail(
        `the remote script appends somewhere other than ${target}. The one append ` +
          `has to be aimed at the file the script named.`
      );
    }
  }
}

{
  // 32. A line that is not one Tortie made produces no argv at all.
  const rows = key.hostileLines ?? [];
  if (rows.length < 5) {
    fail(
      `${String(rows.length)} hostile public key line(s) were tried and the gate ` +
        `wants at least five. This is the check that a value reaching the other ` +
        `machine has to be a line Tortie itself made.`
    );
  }
  for (const row of rows) {
    if (row.threw && row.argvLength === 0) continue;
    fail(
      `a public key line ending ${JSON.stringify(row.sample)} produced an argv ` +
        `of ${String(row.argvLength)} element(s). A line Tortie did not make must ` +
        `be refused before any array exists.`
    );
  }
}

{
  // 33. The private half never goes near the person's own key folder.
  const offending = (key.materialSource ?? []).filter((row) => {
    if (!/homedir|\.ssh|~/.test(String(row.text))) return false;
    return !isDenyingComment(String(row.text));
  });
  for (const row of offending) {
    fail(
      `src/main/machines/key-material.ts:${String(row.line)} names the folder the ` +
        `person keeps their own keys in. Tortie never reads it, never writes it ` +
        `and never copies a key out of it. The line reads: ${row.text}`
    );
  }
  const keyDir = String(key.keyDir ?? '');
  const recordDir = String(key.recordDir ?? '');
  if (keyDir === '' || !keyDir.startsWith(`${recordDir}/`)) {
    fail(
      `the key directory is ${JSON.stringify(keyDir)} and it must sit inside the ` +
        `machine record directory ${JSON.stringify(recordDir)}.`
    );
  }
  const leaves = new Set();
  for (const row of key.hostilePaths ?? []) {
    const path = String(row.path);
    if (!path.startsWith(`${keyDir}/`)) {
      fail(
        `a machine id composed the key path ${JSON.stringify(path)}, which is ` +
          `outside ${JSON.stringify(keyDir)}. A machine id comes from a file an ` +
          `agent process can write, so a path that can leave that directory is a ` +
          `write anywhere on this Mac.`
      );
      continue;
    }
    const leaf = path.slice(keyDir.length + 1);
    if (!/^machine-[0-9a-f]{12}$/.test(leaf)) {
      fail(
        `a machine id composed the file name ${JSON.stringify(leaf)}. The name is ` +
          `a hash so that no character of an id can reach a path or the other machine.`
      );
    }
    if (!/^tortie-[0-9a-f]{12}$/.test(String(row.comment))) {
      fail(
        `a machine id composed the key comment ${JSON.stringify(row.comment)}. ` +
          `The comment crosses to the other machine, so it carries nothing a ` +
          `person or an agent typed.`
      );
    }
    leaves.add(leaf);
  }
  const tried = (key.hostilePaths ?? []).length;
  if (tried < 12) {
    fail(
      `${String(tried)} hostile machine id(s) were tried against the key path and ` +
        `the gate wants at least twelve.`
    );
  }
  if (leaves.size !== tried) {
    fail(
      `${String(tried)} machine ids produced ${String(leaves.size)} file name(s). ` +
        `Two machines sharing one key file means removing one machine cannot ` +
        `revoke anything.`
    );
  }
}

{
  // 34. Nothing on the install path can record what the person typed.
  const FORBIDDEN = [
    { needle: 'manifest', why: 'the durable record every session restores from' },
    { needle: 'confirm-record', why: 'the sealed record of what a person agreed to run' }
  ];
  for (const [file, specifiers] of Object.entries(key.imports ?? {})) {
    for (const specifier of specifiers.map(String)) {
      for (const row of FORBIDDEN) {
        if (!specifier.includes(row.needle)) continue;
        fail(
          `${file} imports ${JSON.stringify(specifier)}, which is ${row.why}. The ` +
            `password a person types crosses one call and is kept nowhere, and the ` +
            `way that is true is that nothing on this path can write it down.`
        );
      }
    }
  }
  for (const file of key.namesSafeStorage ?? []) {
    fail(
      `${String(file)} names safeStorage. The password for a machine is never put ` +
        `in the OS keystore, and a path that cannot name the keystore cannot put ` +
        `it there by accident later.`
    );
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

// ---------------------------------------------------------------------------
// Phase 70's tables
// ---------------------------------------------------------------------------

process.stdout.write('\nattach name                matches b660df9\n');
process.stdout.write('-'.repeat(50) + '\n');
for (const row of attachLocalRows) {
  process.stdout.write(`${pad(row.name, 26)} ${row.equal ? 'yes' : 'NO'}\n`);
}
process.stdout.write(
  `a remote attach is: ${String(data.attachRemoteFile)} ${attachRemoteArgv.join(
    ' '
  )}\n`
);
process.stdout.write(
  `a remote create is: ${(data.remoteCreateArgv ?? []).join(' ')}\n`
);
process.stdout.write(
  `the list format prints ${String(listFields.length)} space separated ` +
    `field(s), every one wrapped in tmux's own quoting, the last ${String(
      (data.remoteListFreeForm ?? []).length
    )} of which are free form.\n`
);
// ---------------------------------------------------------------------------
// Phase 71's table
// ---------------------------------------------------------------------------

process.stdout.write('\nevent            rows         may restore  verdict\n');
process.stdout.write('-'.repeat(56) + '\n');
for (const row of truthVerdicts) {
  process.stdout.write(
    `${pad(row.event, 16)} ${pad(row.rows, 12)} ${pad(row.restorable, 12)} ${row.verdict}\n`
  );
}
process.stdout.write(
  `restore is offered on exactly the ${String(
    truthVerdicts.filter((row) => row.restorable === 'yes').length
  )} arm(s) where a machine answered and its answer did not hold the session. ` +
    `No arm produces needs_input. A machine Tortie cannot see produces ` +
    `unknown, never restorable and never exited.\n`
);

// ---------------------------------------------------------------------------
// Phase 72's tables
// ---------------------------------------------------------------------------

process.stdout.write('\nrestore gate input                             offered  refusal\n');
process.stdout.write('-'.repeat(80) + '\n');
for (const row of gateVerdicts) {
  process.stdout.write(
    `${pad(row.input, 46)} ${pad(row.offered, 8)} ${pad(row.refusal, 14)} ${row.verdict}\n`
  );
}
process.stdout.write(
  `the arms are asked in this order and the first true one is the sentence a ` +
    `person reads: ${(data.gateRefusals ?? []).join(', ')}.\n`
);
process.stdout.write(
  `the fault matrix has ${String(
    (data.matrixAppRows ?? []).length
  )} row(s), every one of them graded by build/remote-matrix.mjs, and the app ` +
    `half is reachable as a harness mode: ` +
    `${data.matrixModeRegistered === true ? 'yes' : 'NO'}.\n`
);

process.stdout.write(
  `node-pty is imported by ${String(
    new Set((data.machinePtyMentions ?? []).map((hit) => hit.file)).size
  )} file(s) under src/main/machines/ and ${String(
    new Set((data.attachPtyMentions ?? []).map((hit) => hit.file)).size
  )} under src/main/attach/. Nothing under machines imports anything under ` +
    `attach (${String((data.machineAttachImports ?? []).length)} hit(s)).\n`
);

// ---------------------------------------------------------------------------
// Phase 79.1's table
// ---------------------------------------------------------------------------

process.stdout.write('\nkey install fact     hash moves  verdict\n');
process.stdout.write('-'.repeat(48) + '\n');
for (const row of keyVerdicts) {
  process.stdout.write(`${pad(row.field, 20)} ${pad(row.moves, 11)} ${row.verdict}\n`);
}
process.stdout.write(
  `the machine execution hash still covers ${data.hashedKeys.join(', ')} and did ` +
    `not gain a field for this. Installing a key is a second agreement with its ` +
    `own hash, ${String(key.algorithm)}, and the two hashes are ` +
    `${key.base === key.machineHash ? 'THE SAME' : 'different'} values.\n`
);
process.stdout.write(
  `the install writes ${String(key.remoteFilePath)} on the other machine and ` +
    `keeps the private half at ${String(key.keyDir)}.\n`
);
process.stdout.write(
  `a key install is: ${(key.argv ?? []).join(' ')}\n`
);
process.stdout.write(
  `${String((key.hostileLines ?? []).length)} hostile public key line(s) were ` +
    `tried and every one produced no argv at all. ` +
    `${String((key.hostilePaths ?? []).length)} hostile machine id(s) all landed ` +
    `inside ${String(key.keyDir)}.\n`
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
