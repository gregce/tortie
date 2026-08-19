/**
 * `npm run conformance:machines`. The cheap gate that keeps the machine
 * confirm gate executable rather than asserted (Phase 68, research 51 section
 * 4.2).
 *
 * WHAT IT IS FOR. A machine row names a computer Tortie may sign in to as the
 * user, and a program it may run there. The claim that comes with that is
 * large: a person agrees once, the agreement is bound to the five fields that
 * decide what runs, and nothing else can move it. Phase 68 shipped four of them
 * and Phase 83 added the accepted tmux version as the fifth. A claim like that
 * decays.
 * This gate is the executable half of it, and it costs about a second.
 *
 * It is the fourth gate of its shape, beside `conformance:agents`,
 * `conformance:installs` and `conformance:context`. It spawns nothing: no ssh,
 * no tmux server, no Electron, no manifest, no file under the person's home, no
 * request and no write anywhere. Safe on a machine with live sessions on it.
 *
 * THE FORTY NINE CONDITIONS IT FAILS ON. Each one is a way a person's agreement
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
 *     how a sixth field added later would fall out of the hash. PHASE 83 MOVED
 *     WHICH ROW THIS READS. The key set is taken from a row carrying every
 *     field, because the fifth field is appended to the hash text only when it
 *     is set. Condition 43 reads the row that carries no acceptance.
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
 * 15. The ledger holds any of the three verbs this release refuses, a row
 *     carries an empty reason, or a verb the plane does send is absent from it.
 * 16. `SERVER_OPTIONS` and `resources/gmux-tmux.conf` disagree on any option,
 *     value or scope flag, in either direction; the local re-assert order moved;
 *     or a second row started taking its value from Settings.
 * 17. `TESTED_REMOTE_TMUX_VERSIONS` is empty, a row is missing its measurement
 *     date, its note or its subject, or a row claims control mode was measured
 *     while the exec plane was not. PHASE 83 ADDED THE SUBJECT. A row names
 *     which copy of that version was read, because a distribution's patched
 *     build is not the same subject as an upstream tarball. Phase 69 and Phase 70 failed on ANY control claim, because
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
 *     of `kill-server`, `attach-session` or `respawn-pane` left the refused
 *     list. PHASE 89 TOOK `send-keys` OFF THAT LIST and put it on the ledger as
 *     the first row that is not safe to run twice, so conditions 63 to 67 below
 *     are what stand in its place.
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
 *     PHASE 83 ADDED A FIFTH FIELD TO THE MACHINE HASH, being
 *     `acceptedTmuxVersion`, and conditions 1, 2, 7 and 43 now hold that set at
 *     five. THE KEY INSTALL HASH STILL DOES NOT CARRY IT, and that is the point
 *     of this condition rather than an omission. Installing a key is a second
 *     act over its own facts, being the machine id, the address, the account
 *     name, the port, the file written on that machine and the path the private
 *     half is kept at here. Which version of tmux that machine runs is not one
 *     of those facts, and changing it changes nothing about the key.
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
 * 35. The remote script catalogue holds a duplicate id, a row with a thin
 *     reason, a script that does not begin `set -e` and then `umask 077`, a
 *     script with an odd number of markers, or a number of write scripts that
 *     is not exactly one.
 * 36. A script text carries a backtick, reads a positional parameter beyond its
 *     declared count, never reads one it declares, or reads one that is not
 *     inside double quotes.
 * 37. A composed command is not the output of one `shellQuoteArgv` call over an
 *     argv array, does not carry the script text exactly once as one quoted
 *     argument, or carries a hostile value anywhere other than once in the
 *     quoted tail. Also fails when the value appears inside the script text.
 * 38. A `read` script names a program that can remove or replace a file, or
 *     carries a `>` that is not part of `2>/dev/null`. A git script names a
 *     verb other than `rev-parse`, `status` and `show`, or takes its verb from
 *     a parameter. The one `write` script aims a redirection at anything other
 *     than its temporary name, or does not move that name into place.
 * 39. The two copies of the drop refusal, being main's and the renderer's, are
 *     not byte identical. Also fails when the largest image the contract allows
 *     composes a command longer than one argument of a Linux login shell.
 * 40. `remote-scripts.ts` imports anything at all, or `carriage.ts`,
 *     `context.ts`, `exec-plane.ts` or `control-plane.ts` imports the door.
 *     `execRemoteShell` is called from a file that is not on the named list.
 * 41. The confirm hash does not move for `acceptedTmuxVersion` varied alone, or
 *     does not move when a row that carried one is set back to carrying none.
 *     This is the condition refusal 8 in CLAUDE.md asks for: which version of a
 *     program Tortie will start work on is a field that decides what runs.
 * 42. The hash of a row whose `acceptedTmuxVersion` is null differs from the
 *     hex pinned in this gate, which was taken from this same gate on
 *     2026-08-18, before Phase 83 changed anything. This is what proves the new
 *     field does not ask every already confirmed machine to be confirmed again.
 * 43. `MACHINE_EXECUTION_FIELDS` is not five, does not carry
 *     `acceptedTmuxVersion`, or the key set the hash covers for a row with NO
 *     acceptance is not exactly the other four.
 * 44. `decideRemoteControlGate` gives a different answer when a version is
 *     accepted for the exec plane, an acceptance carries a version nobody could
 *     read, or an acceptance outranks a measurement.
 * 45. A row whose `acceptedTmuxVersion` is not a plain version string is not
 *     dropped whole, or is dropped without a problem naming the field and the
 *     reason, or takes a valid row down with it. It is condition 5's mechanism
 *     over five hostile values.
 *
 * Conditions 46 to 48 arrived with Phase 84 and are described at their own
 * block further down this file, beside the checks themselves.
 *
 * 49. A script runs a git command that is not one of the three read verbs and
 *     does not carry both `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never`
 *     in front of it, or a script other than `git-clone` names `clone` or
 *     `ls-remote`. The first half is what stops a command on a machine nobody
 *     is watching from stopping to wait for a password, which reads to a person
 *     as the app freezing. The second half binds the widening of the verb list
 *     to ONE script id, because a verb allowed everywhere is a verb any future
 *     script can use.
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
 *
 * Conditions 63 to 67 read the ledger row for `send-keys`, the argv the one
 * armed resume door composes, and the set of files that name that door. They
 * send nothing and they type nothing on any machine. That a real machine takes
 * the text once, and that a second send is FOUND rather than assumed away, is
 * `node build/probe-remote-arm.mjs` and step 10a of `npm run smoke:remote`.
 *
 * Conditions 35 to 40 read the TEXT of the seven scripts Tortie may run on
 * another machine, and the composed command for each. Nothing is sent, no
 * machine is asked anything, and no image is written anywhere. What they prove
 * is that the text has the properties the header of
 * `src/main/machines/remote-scripts.ts` claims for it. That a machine RUNS them,
 * and that the bytes arrive whole, is `node build/probe-remote-image.mjs`.
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
// PHASE 83. Read from a row carrying EVERY field. The fifth is appended to the
// hash text only when it is set, so a row with no acceptance covers four keys on
// purpose, and condition 43 is what holds that half.
const hashedEverything = data.hashedKeysAccepted ?? data.hashedKeys;
if (hashedEverything.join('|') !== declared.join('|')) {
  const missing = declared.filter((k) => !hashedEverything.includes(k));
  const extra = hashedEverything.filter((k) => !declared.includes(k));
  fail(
    'the fields the hash actually covered and MACHINE_EXECUTION_FIELDS disagree. ' +
      `Missing from the hash: ${missing.join(', ') || 'nothing'}; hashed but not ` +
      `declared: ${extra.join(', ') || 'nothing'}. This is how a sixth field added ` +
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
  // PHASE 83. Which copy of that version was read.
  if (typeof row.subject !== 'string' || Number(row.subjectLength) < 10) {
    fail(
      `the row for ${String(row.version)} does not say which copy of that ` +
        `version was read. A distribution's patched build is not the same ` +
        `subject as an upstream tarball, and a row that does not say which one ` +
        `it read is a row the next reader cannot trust.`
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
// PHASE 89 TOOK `send-keys` OFF THIS LIST, and it is the only verb that ever
// left it. It is not allowed generally: it is on the ledger as the first row
// whose repeat class is unsafe, the general door refuses it, and one narrow
// door named in condition 65 may send one line of Tortie's own composed text.
// The other three stay here and nothing on this rung sends them.
const STILL_REFUSED = ['kill-server', 'attach-session', 'respawn-pane'];
for (const verb of STILL_REFUSED) {
  if ((data.forbiddenVerbs ?? []).includes(verb)) continue;
  fail(
    `"${verb}" left the refused list. attach-session in particular is refused ` +
      `forever: attach is a different plane with a different carriage, and a ` +
      `person's keystrokes must never be reachable through a one-shot exec.`
  );
}
if ((data.forbiddenVerbs ?? []).includes('send-keys')) {
  fail(
    'send-keys is back on the refused list AND on the ledger, so two rules ' +
      'now disagree about the one verb that can type on another machine. One ' +
      'of them is not being read.'
  );
}

// ---------------------------------------------------------------------------
// 63 to 67. PHASE 89. The one door that may type on another machine
// ---------------------------------------------------------------------------
//
// Each condition here is one of the five rules the phase was built to. They are
// checked from the composed shapes and from the source tree, and nothing in
// this block contacts a machine.

// 63. The ledger row itself, being rule 5.
{
  const row = ledger.find((one) => one.verb === 'send-keys');
  if (row === undefined) {
    fail(
      'send-keys is not on the ledger, so the one door that may type on ' +
        'another machine would be refused by its own gate.'
    );
  } else {
    if (row.repeat !== 'unsafe') {
      fail(
        `the ledger row for send-keys reads ${JSON.stringify(row.repeat)}. ` +
          `Running it twice types the text twice and tmux has no rule that ` +
          `stops the second copy, so the row has to say it is unsafe. A row ` +
          `edited to safe would let the general door send it.`
      );
    }
    if (String(row.guard ?? '') === '') {
      fail(
        'the ledger row for send-keys names no guard. An unsafe row is worth ' +
          'something only when the thing that finds a repeat after it has ' +
          'happened is named on the row itself.'
      );
    }
    if (Number(row.reasonLength) < 120) {
      fail(
        `the ledger row for send-keys says almost nothing about why it is not ` +
          `safe to run twice. It is the only unsafe row on this list and the ` +
          `reasoning is the whole reason it may be there at all.`
      );
    }
    if (row.kind !== 'mutating') {
      fail(
        `the ledger row for send-keys is ${JSON.stringify(row.kind)} rather ` +
          `than mutating, so it could be sent before the machine's own ` +
          `program search list had been read.`
      );
    }
  }
}

// 64. The composed argv, being rule 3. Five elements, -l, and no key name.
{
  const argv = (data.armedResumeArgv ?? []).map(String);
  if (argv.length !== 5) {
    fail(
      `the armed resume composes ${String(argv.length)} elements rather than ` +
        `five, so a caller could be adding something to the line.`
    );
  }
  if (argv[0] !== 'send-keys' || argv[1] !== '-t' || argv[3] !== '-l') {
    fail(
      `the armed resume argv is ${JSON.stringify(argv)} rather than ` +
        `send-keys -t <id> -l <text>.`
    );
  }
  for (const forbidden of ['Enter', 'C-m', ';']) {
    if (!argv.includes(forbidden)) continue;
    fail(
      `the armed resume argv carries ${JSON.stringify(forbidden)}. Tortie ` +
        `types the command and the person presses Enter, on every machine, ` +
        `and that promise is this line.`
    );
  }
}

// 68. The counter finds a command the shell wrapped, being rule 4.
//
// THE FIX ROUND ADDED THIS CONDITION AND IT IS THE ONE THAT WOULD HAVE CAUGHT
// THE DEFECT. `capture-pane -J` joins a row the TERMINAL wrapped. zsh wraps its
// own input line and writes its own line break, so tmux never marks that row as
// wrapped and `-J` has nothing to join. A counter that searched for a
// contiguous string found 0 copies of a command that was on the screen, so an
// armed resume that had landed was reported as absent and a real double send
// was never reported as twice. The operator's shell is zsh and both readings
// were measured on his Mac Pro.
{
  const counts = data.armedResumeWrapCounts ?? {};
  if (counts.onceWrapped !== 1) {
    fail(
      `the counter finds ${String(counts.onceWrapped)} copies of a command a ` +
        `shell wrapped across three rows, and it should find one. A person ` +
        `whose command landed would be told it did not, and a double send ` +
        `would never be found. The screen a wrapped command produces is not a ` +
        `contiguous string and the counter has to survive that.`
    );
  }
  if (counts.twiceWrapped !== 2) {
    fail(
      `the counter finds ${String(counts.twiceWrapped)} copies of a wrapped ` +
        `command that was sent twice, and it should find two. This is the ` +
        `measurement the ledger row's unsafe class claims, being that a second ` +
        `copy is found rather than assumed away.`
    );
  }
  if (counts.absent !== 0) {
    fail(
      `the counter finds ${String(counts.absent)} copies of the command on a ` +
        `screen that holds a prompt and nothing else. A counter that finds a ` +
        `command nobody typed would report every failed send as armed.`
    );
  }
}

// 65. One product call site, being rule 2.
{
  const expected = [
    'src/main/machines/exec-smoke.ts',
    'src/main/machines/remote-arm.ts'
  ];
  const actual = (data.armedResumeCallFiles ?? []).map(String);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `sendArmedResumeText is named in ${JSON.stringify(actual)} outside its ` +
        `own file. Exactly two may name it: remote-arm.ts, which is the one ` +
        `product caller and the only reason the door exists, and exec-smoke.ts, ` +
        `which is the harness that watches the door's refusals fire against the ` +
        `built bundle. A third file is a second way to type on somebody else's ` +
        `computer.`
    );
  }
}

// 66. Who names the verb at all, so a later round cannot open a second route.
{
  const expected = [
    'src/main/machines/exec-plane.ts',
    'src/main/machines/exec-smoke.ts',
    'src/main/machines/remote-smoke.ts'
  ];
  const actual = (data.sendKeysLiteralFiles ?? []).map(String);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail(
      `the files under src/main/machines/ that name "send-keys" are ` +
        `${JSON.stringify(actual)} rather than ${JSON.stringify(expected)}. ` +
        `exec-plane.ts owns the ledger and the door, exec-smoke.ts watches the ` +
        `refusals fire, and remote-smoke.ts spawns the far tmux directly to set ` +
        `a session up for a test. The local tmux layer is outside this ` +
        `condition on purpose: it sends keys to sessions on this Mac and always ` +
        `has.`
    );
  }
}

// 67. The three verbs that stay refused are still named as refused forever.
if (!(data.forbiddenVerbs ?? []).includes('attach-session')) {
  fail(
    'attach-session is not on the refused list. It is refused forever: attach ' +
      'is a different plane with a different carriage, and a person’s ' +
      'keystrokes must never be reachable through a one-shot exec. Phase 89 ' +
      'opened one narrow door for text Tortie composed itself and it did not ' +
      'open this one.'
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
// 41 to 45. The version a person accepted for one machine (Phase 83)
// ---------------------------------------------------------------------------

/**
 * The hash of the gate's own base machine, with no accepted version.
 *
 * TAKEN FROM THIS GATE ON 2026-08-18, on the commit before Phase 83 changed
 * anything, by running `build/machines-conformance-probe.mts` and reading its
 * `base`. It is hard coded here on purpose. Phase 83 added a fifth field to the
 * machine hash, and the one property that keeps every machine a person has
 * already confirmed confirmed is that a row carrying no acceptance hashes to
 * exactly what it hashed to before. A pinned hex is the only way to check that,
 * because every other value in this gate is computed by the same code that
 * would be wrong.
 *
 * If this number ever has to move, every machine every person confirmed is
 * being asked again, and that is a decision rather than a rebase.
 */
const UNACCEPTED_HASH_2026_08_18 =
  'dbd8aa39c1dd0154b556593a2a4ef56e2471afd575d98f3f8431abe20c445d46';

const accepted = data.acceptedVersion ?? null;
const acceptVerdicts = [];

if (accepted === null) {
  fail(
    'the probe printed nothing about the accepted version field, so conditions ' +
      '41 to 43 checked nothing at all.'
  );
} else {
  // 41. The hash moves for the fifth field, in both directions.
  const movesWhenSet = accepted.accepted !== accepted.unaccepted;
  const movesBetweenVersions = accepted.accepted !== accepted.acceptedOther;
  const movesWhenCleared = accepted.backToUnset !== accepted.accepted;
  if (!movesWhenSet) {
    fail(
      'accepting a version left the confirm hash unchanged. A person would be ' +
        'able to make Tortie start work on a version nobody measured without ' +
        'the sheet ever moving.'
    );
  }
  if (!movesBetweenVersions) {
    fail(
      'two different accepted versions hashed to the same value, so an ' +
        'acceptance of one version would carry to another.'
    );
  }
  if (!movesWhenCleared) {
    fail(
      'withdrawing an accepted version left the confirm hash unchanged. ' +
        'Removing a value changes what runs exactly as much as replacing it.'
    );
  }
  acceptVerdicts.push({
    field: 'acceptedTmuxVersion',
    kind: 'execution',
    moves: movesWhenSet && movesBetweenVersions && movesWhenCleared ? 'yes' : 'NO',
    verdict:
      movesWhenSet && movesBetweenVersions && movesWhenCleared ? 'pass' : 'FAIL'
  });

  // 42. A machine nobody accepted a version for is not asked again.
  if (accepted.unaccepted !== UNACCEPTED_HASH_2026_08_18) {
    fail(
      `a machine with no accepted version now hashes to ${String(
        accepted.unaccepted
      )} and it hashed to ${UNACCEPTED_HASH_2026_08_18} before Phase 83. Every ` +
        'machine every person confirmed would be asked to confirm it again, ' +
        'and asking again for a change that cannot affect them is how a person ' +
        'is trained to click through the sheet that matters.'
    );
  }
  if (accepted.backToUnset !== UNACCEPTED_HASH_2026_08_18) {
    fail(
      'a row whose accepted version was withdrawn does not hash back to what ' +
        'it hashed to before the acceptance, so withdrawing would leave the ' +
        'machine permanently unconfirmed.'
    );
  }
  if (accepted.unacceptedCanonicalCarriesKey) {
    fail(
      'the hash text of a row with no accepted version carries the key ' +
        'anyway, which is the same hole stated above.'
    );
  }
  if (!accepted.canonicalCarriesVersion) {
    fail(
      'the hash text of a row WITH an accepted version does not carry the ' +
        'version, so the acceptance is not covered by the hash at all.'
    );
  }
  const sheetSaysIt = (accepted.sheetLines ?? []).some((line) =>
    String(line).includes('3.9a')
  );
  if (!sheetSaysIt) {
    fail(
      'the sheet a person reads does not name the version they would be ' +
        'accepting, so the lines and the hash do not say the same thing.'
    );
  }
}

// 43. The declared list is five, and the four Phase 68 fields still stand alone.
const declaredFields = [...(data.executionFields ?? [])];
if (declaredFields.length !== 5) {
  fail(
    `MACHINE_EXECUTION_FIELDS lists ${String(declaredFields.length)} field(s) ` +
      'and Phase 83 holds it at five.'
  );
}
if (!declaredFields.includes('acceptedTmuxVersion')) {
  fail(
    'MACHINE_EXECUTION_FIELDS does not carry acceptedTmuxVersion, so the field ' +
      'that decides whether Tortie starts work on an unmeasured version is not ' +
      'declared as one that decides what runs.'
  );
}
const phase68Keys = declaredFields
  .filter((field) => field !== 'acceptedTmuxVersion')
  .sort();
if ([...(data.hashedKeys ?? [])].sort().join('|') !== phase68Keys.join('|')) {
  fail(
    'the key set the hash covers for a row with NO accepted version is ' +
      `${(data.hashedKeys ?? []).join(', ')} rather than the four Phase 68 ` +
      `fields ${phase68Keys.join(', ')}. That is the property that keeps every ` +
      'already confirmed machine confirmed.'
  );
}

// 44. An acceptance is for the exec plane and reaches no other one.
const reach = data.acceptanceReach ?? null;
if (reach === null) {
  fail('the probe printed nothing about where an acceptance reaches.');
} else {
  if (reach.exec !== 'accepted') {
    fail(
      `the exec gate answered ${String(reach.exec)} for a version a person ` +
        'accepted. The whole surface exists to make that answer accepted.'
    );
  }
  if (reach.control !== 'unmeasured') {
    fail(
      `the control gate answered ${String(reach.control)} for a version that ` +
        'was accepted for the exec plane only. An acceptance says nothing ' +
        'about the wire protocol, and the one measured failure in this tree is ' +
        'a control mode hang.'
    );
  }
  if (reach.execWithoutAcceptance !== 'unmeasured') {
    fail(
      'the exec gate allowed a version nobody measured and nobody accepted.'
    );
  }
  if (reach.unreadableWithAcceptance !== 'unreadable') {
    fail(
      'an acceptance carried a version nobody could read. There is nothing for ' +
        'an acceptance to bind to when the machine named no version.'
    );
  }
  if (reach.measuredBeatsAccepted !== 'measured') {
    fail(
      'a measured version answered as accepted rather than as measured, so a ' +
        "version that later earns a measurement would still be carried by a " +
        "person's acceptance."
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
for (const row of [...fieldVerdicts, ...acceptVerdicts]) {
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
// 35 to 40. Phase 73. The second door, and the seven scripts it may send
// ---------------------------------------------------------------------------
//
// The exec plane carries tmux verbs and its ledger decides which. This door
// carries one of Tortie's own constant scripts on the far side's LOGIN SHELL,
// and a login shell runs anything. So the discipline here is stronger than the
// ledger's: the script is a compiled constant, the values reach the far side as
// positional parameters, and no script text is composed at run time.
//
// Every check below reads the text. None of them sends anything.

const scriptVerdicts = [];
const run = data.remoteRun ?? {};
const scripts = run.scripts ?? [];

/** Programs that can remove or replace something a person already had. */
const MUTATING_PROGRAMS = [
  'rm',
  'mv',
  'cp',
  'mkdir',
  'touch',
  'chmod',
  'chown',
  'ln',
  'dd',
  'tee',
  'truncate'
];

/** The git verbs ANY script in the catalogue may name. All three are reads. */
const ALLOWED_GIT_VERBS = ['rev-parse', 'status', 'show'];

/**
 * The two more verbs `git-clone` may name, and no other script may.
 *
 * PHASE 90.2 WIDENED THE LIST, once and on purpose, and bound the widening to
 * one script id. A verb allowed everywhere is a verb any future script can use.
 */
const GIT_CLONE_VERBS = ['ls-remote', 'clone'];

/**
 * Every script that may write, in catalogue order.
 *
 * PHASE 90.2 MOVED THIS FROM ONE TO TWO. It is the number that bounds what
 * Tortie can do to another person's computer, so it stays an exact allowlist
 * and never becomes a count.
 */
const ALLOWED_WRITERS = ['image-put', 'git-clone'];

{
  // 35. The catalogue's shape.
  if (scripts.length === 0) {
    fail(
      'the remote script catalogue is empty, so either it went away or this ' +
        'gate stopped reading it. Either way nothing below is checking anything.'
    );
  }
  const ids = scripts.map((row) => row.id);
  if (new Set(ids).size !== ids.length) {
    fail(
      `two remote scripts share an id: ${ids.join(', ')}. The door looks a ` +
        `script up by name, so two of one name is two answers to one question.`
    );
  }
  const writers = run.writers ?? [];
  const writersAgree =
    writers.length === ALLOWED_WRITERS.length &&
    writers.every((id, at) => id === ALLOWED_WRITERS[at]);
  if (!writersAgree) {
    fail(
      `${String(writers.length)} script(s) in the catalogue write, being ` +
        `${writers.join(', ') || 'none'}. Exactly ${String(
          ALLOWED_WRITERS.length
        )} may, being ${ALLOWED_WRITERS.join(', ')}, in that order. This is the ` +
        `number that bounds what Tortie can do to another person's computer, ` +
        `and Phase 90.2 moved it from one to two once and on purpose.`
    );
  }
  for (const row of scripts) {
    if (row.reasonLength < 30) {
      fail(
        `remote script ${row.id} carries a ${String(row.reasonLength)} ` +
          `character reason for why running it twice is safe. A verb ledger row ` +
          `has to say it and so does this.`
      );
    }
    if (row.firstLine !== 'set -e' || row.secondLine !== 'umask 077') {
      fail(
        `remote script ${row.id} begins ${JSON.stringify(row.firstLine)} then ` +
          `${JSON.stringify(row.secondLine)}. Every one begins set -e and then ` +
          `umask 077, so a failure stops the script and a file it creates is ` +
          `not readable by another account on that machine.`
      );
    }
    if (row.markers === 0 || row.markers % 2 !== 0) {
      fail(
        `remote script ${row.id} prints ${String(row.markers)} marker(s). An ` +
          `odd count is a pair that was opened and never closed, and an answer ` +
          `read out of that is everything the far side printed after it.`
      );
    }
  }
}

{
  // 36. The text is a constant, and every value it reads is quoted.
  for (const row of scripts) {
    if (row.carriesBacktick) {
      fail(
        `remote script ${row.id} carries a backtick. Script text is a compiled ` +
          `constant, and a backtick is how a value becomes script on the other ` +
          `machine.`
      );
    }
    const read = new Set((row.positionals ?? []).map((one) => one.index));
    for (let at = 1; at <= row.params; at += 1) {
      if (read.has(at)) continue;
      fail(
        `remote script ${row.id} declares ${String(row.params)} value(s) and ` +
          `never reads $${String(at)}. A declared value nothing reads is a value ` +
          `nothing checks.`
      );
    }
    for (const one of row.positionals ?? []) {
      if (one.index > row.params) {
        fail(
          `remote script ${row.id} reads $${String(one.index)} and declares ` +
            `${String(row.params)} value(s), so it reads a value no caller was ` +
            `asked for.`
        );
      }
      if (one.quoting !== 'double') {
        fail(
          `remote script ${row.id} reads $${String(one.index)} at byte ` +
            `${String(one.at)} ${one.quoting === 'bare' ? 'unquoted' : 'inside single quotes'}. ` +
            `An unquoted one turns a path with a space into two arguments, and a ` +
            `single quoted one is text rather than the value.`
        );
      }
    }
    scriptVerdicts.push({
      id: row.id,
      mode: row.mode,
      params: String(row.params),
      bytes: String(row.bytes),
      quoting: (row.positionals ?? []).every((one) => one.quoting === 'double')
        ? 'all quoted'
        : 'NOT ALL QUOTED'
    });
  }
}

{
  // 37. One quoting call, over a list, and the value travels as an argument.
  for (const row of scripts) {
    if (row.command !== row.commandRecomposed) {
      fail(
        `the command for ${row.id} is not the output of one shellQuoteArgv call ` +
          `over an argv array.\n      composed    ${JSON.stringify(row.command.slice(0, 120))}` +
          `\n      recomposed  ${JSON.stringify(row.commandRecomposed.slice(0, 120))}`
      );
    }
    if (row.scriptInCommandOnce !== 1) {
      fail(
        `the script text of ${row.id} appears ${String(row.scriptInCommandOnce)} ` +
          `time(s) as one quoted argument of its command, and it must appear ` +
          `exactly once.`
      );
    }
    if (row.hostileInScript) {
      fail(
        `a caller's value reached the script text of ${row.id}. Values are ` +
          `positional parameters and never script.`
      );
    }
    if (row.params === 0) continue;
    if (row.hostileInCommand !== 1) {
      fail(
        `a hostile value appears ${String(row.hostileInCommand)} time(s) in the ` +
          `command for ${row.id} and it must appear exactly once, as an argument.`
      );
    }
    if (!row.hostileQuoted) {
      fail(
        `a hostile value is not quoted in the command for ${row.id}, so the far ` +
          `side's shell would read it as more than one thing.`
      );
    }
  }
}

{
  // 38. A read script reads. Each of the two writes obeys its OWN redirection
  //     rule, because the two are different shapes: `image-put` decodes bytes
  //     into a file and moves a temporary name into place, and `git-clone`
  //     asks git to make a folder and keeps nothing. Sharing one rule would
  //     either weaken the image rule or make the clone rule a lie.
  for (const row of scripts) {
    if (row.mode === 'read') {
      const named = (row.words ?? []).filter((word) =>
        MUTATING_PROGRAMS.includes(word)
      );
      if (named.length > 0) {
        fail(
          `read script ${row.id} names ${[...new Set(named)].join(', ')}, which ` +
            `can remove or replace something the person already had.`
        );
      }
      if ((row.redirects ?? []).length > 0) {
        fail(
          `read script ${row.id} redirects to ${row.redirects.join(', ')}. The ` +
            `only redirection a read may carry is 2>/dev/null, and a read that ` +
            `writes is not a read.`
        );
      }
    } else if (row.id === 'image-put') {
      const targets = row.redirects ?? [];
      if (targets.length === 0) {
        fail(
          `write script ${row.id} carries no redirection at all, so this gate ` +
            `cannot tell what it writes to.`
        );
      }
      for (const target of targets) {
        if (target === '"$t"') continue;
        fail(
          `write script ${row.id} redirects to ${target}. Every redirection has ` +
            `to aim at the temporary name, so a link that dies halfway leaves a ` +
            `part file rather than half an image under the real name.`
        );
      }
      if (!row.text.includes('mv "$t" "$f"')) {
        fail(
          `write script ${row.id} does not move its temporary name into place, ` +
            `so either it writes the real name directly or it leaves the part ` +
            `file behind.`
        );
      }
      if (!row.text.includes('if [ -f "$f" ]; then')) {
        fail(
          `write script ${row.id} does not check whether the file is already ` +
            `there. That check is what makes this write safe to run twice.`
        );
      }
    } else if (row.id === 'git-clone') {
      // PHASE 90.2. The second write, and its own two rules. It keeps nothing
      // it is given, so every redirection in it throws bytes away, and it
      // refuses a destination that is already there before it does anything
      // else. That refusal is what makes it safe to run twice.
      const targets = row.redirects ?? [];
      if (targets.length === 0) {
        fail(
          `write script ${row.id} carries no redirection at all, so this gate ` +
            `cannot tell what it writes to.`
        );
      }
      for (const target of targets) {
        if (target === '/dev/null') continue;
        fail(
          `write script ${row.id} redirects to ${target}. Every redirection in ` +
            `it has to aim at /dev/null, because the only thing it writes is ` +
            `the folder git makes and everything else it reads is thrown away.`
        );
      }
      if (!row.text.includes('if [ -e "$d" ]; then')) {
        fail(
          `write script ${row.id} does not test its destination with -e before ` +
            `anything else. That test is what makes it safe to run twice, and ` +
            `it is what stops it ever writing into a folder a person already had.`
        );
      }
    } else {
      fail(
        `write script ${row.id} has no redirection rule of its own in this ` +
          `gate. Every write carries its own rule, because two writes of ` +
          `different shapes cannot share one.`
      );
    }
    // PHASE 90.2. The three read verbs are allowed everywhere. The two the
    // clone needs are allowed in `git-clone` and nowhere else.
    const allowedVerbs =
      row.id === 'git-clone'
        ? [...ALLOWED_GIT_VERBS, ...GIT_CLONE_VERBS]
        : ALLOWED_GIT_VERBS;
    for (const verb of row.gitVerbs ?? []) {
      if (allowedVerbs.includes(verb)) continue;
      fail(
        `remote script ${row.id} runs git ${verb}. The verbs it may name are ` +
          `${allowedVerbs.join(', ')}, and anything else turns a review into ` +
          `something that changes a repository.`
      );
    }
    if (row.gitVerbIsAValue) {
      fail(
        `remote script ${row.id} takes its git verb from a parameter. The verb ` +
          `is part of the text so no caller can choose it.`
      );
    }
  }
}

{
  // 39. One sentence in two places, and one limit that has to fit.
  if (run.dropCopyRenderer === '') {
    fail(
      'the renderer copy of the drop refusal could not be read out of ' +
        'src/renderer/terminal/drop/remote.ts, so this gate is not comparing ' +
        'anything.'
    );
  } else if (run.dropCopyMain !== run.dropCopyRenderer) {
    fail(
      `the two copies of the drop refusal have drifted apart.\n      main      ` +
        `${JSON.stringify(run.dropCopyMain)}\n      renderer  ${JSON.stringify(
          run.dropCopyRenderer
        )}`
    );
  }
  const biggest = run.biggestImageCommand ?? {};
  if (!biggest.fits) {
    fail(
      `the largest image the contract allows, being ` +
        `${String(run.imageMaxBytes)} bytes, composes a command of ` +
        `${String(biggest.bytes)} bytes and one argument of a Linux login shell ` +
        `is ${String(run.maxBytes)}. Every upload of that size would fail on a ` +
        `machine nobody measured.`
    );
  }
}

{
  // 40. The import graph, because a cycle here is a door that can be opened
  //     from inside the room it guards.
  if ((run.scriptsImports ?? []).length > 0) {
    fail(
      `remote-scripts.ts imports ${run.scriptsImports.join(', ')}. It is pure ` +
        `data and it imports nothing, so nothing it holds can depend on a ` +
        `connection, a record or a manifest row.`
    );
  }
  const FORBIDDEN_IMPORTERS = [
    'carriage.ts',
    'context.ts',
    'exec-plane.ts',
    'control-plane.ts'
  ];
  for (const file of run.importersOfRun ?? []) {
    if (!FORBIDDEN_IMPORTERS.includes(file)) continue;
    fail(
      `${file} imports the door in remote-run.ts, and the door imports it. Two ` +
        `modules importing each other is safe only while neither reads the ` +
        `other's binding while its own body runs, and this pair cannot promise ` +
        `that.`
    );
  }
  const ALLOWED_SHELL_CALLERS = [
    'exec-plane.ts',
    'prepare.ts',
    'remote-argv.ts',
    'remote-path.ts',
    'remote-run.ts'
  ];
  for (const file of run.shellCallers ?? []) {
    if (ALLOWED_SHELL_CALLERS.includes(file)) continue;
    fail(
      `${file} calls execRemoteShell. A command that crosses to a machine goes ` +
        `through the ledger in exec-plane.ts or the catalogue in ` +
        `remote-scripts.ts, and a fifth caller composing its own string is ` +
        `neither.`
    );
  }
}

// ---------------------------------------------------------------------------
// 49. Phase 90.2. Every git command on a machine, and who may name which verb
// ---------------------------------------------------------------------------
//
// Phase 90.2 gave the catalogue a second write, and that write asks git to copy
// a project onto somebody's computer. Two properties of the TEXT are what make
// it safe, and this condition is what keeps both of them checkable rather than
// asserted.
//
// A git command that can stop and wait for a password is a hang, and a hang on
// a machine nobody is watching reads to a person as the app freezing. So every
// git command that is not one of the three read verbs carries
// `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never` in front of it. The three
// read verbs are exempt because each of them runs inside a repository the
// person already has on that machine, and none of them reaches a server.
//
// The two verbs the copy needs are bound to ONE script id. A verb allowed
// everywhere is a verb any future script can use, and this is the check that
// keeps the widening where Phase 90.2 put it.

const READ_ONLY_GIT_VERBS = new Set(ALLOWED_GIT_VERBS);

{
  for (const row of scripts) {
    for (const call of row.gitCalls ?? []) {
      if (READ_ONLY_GIT_VERBS.has(call.verb)) continue;
      if (!call.prompt || !call.gcm) {
        const missing = [
          call.prompt ? null : 'GIT_TERMINAL_PROMPT=0',
          call.gcm ? null : 'GCM_INTERACTIVE=never'
        ].filter((one) => one !== null);
        fail(
          `remote script ${row.id} runs git ${call.verb} without ` +
            `${missing.join(' and ')} in front of it. A git command that ` +
            `reaches a server can stop and wait for a password, and nobody is ` +
            `watching the machine it would wait on.`
        );
      }
    }
    for (const verb of row.gitVerbs ?? []) {
      if (!GIT_CLONE_VERBS.includes(verb)) continue;
      if (row.id === 'git-clone') continue;
      fail(
        `remote script ${row.id} names git ${verb}. Only git-clone may name ` +
          `${GIT_CLONE_VERBS.join(' or ')}, because a verb allowed everywhere ` +
          `is a verb any future script can use.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 50 and 51. Phase 90.3. The path a renderer chooses, and the tree it walks
// ---------------------------------------------------------------------------
//
// Until this phase every path that reached `review-file` came from a
// `review-list` answer, so nothing could aim it. The Explorer changes that: from
// this phase the renderer chooses the path. Research 55 section 9.3 ran that
// script's exact text with `../above.txt` and read a file above the repository
// root. So the script gained one constant line that refuses a path starting with
// a slash and a path holding two dots, and this is the condition that reads it.
//
// A guard in main would be a SECOND COPY of a rule the far side has to enforce
// anyway, and two copies of one rule is how one of them goes stale.

const REVIEW_FILE_GUARD = 'case "$2" in /*|*..*) exit 1;; esac';

{
  const p903 = data.phase903 ?? {};
  // 50. The containment line, read from the text, and standing BEFORE anything
  //     that uses the value it guards.
  const review = p903.reviewFile ?? null;
  if (review === null) {
    fail(
      'the catalogue holds no script called review-file, so the read only ' +
        'review of a file on another machine has no far side at all.'
    );
  } else {
    if (review.guard !== REVIEW_FILE_GUARD) {
      fail(
        `review-file carries ${JSON.stringify(review.guard)} where its ` +
          `containment line should be. It is exactly ` +
          `${JSON.stringify(REVIEW_FILE_GUARD)}. Research 55 section 9.3 ran ` +
          `this script's text with ../above.txt and read a file above the ` +
          `repository root, and from Phase 90.3 the renderer chooses the path ` +
          `that reaches it.`
      );
    }
    if (review.guardAt < 0 || review.firstUseAt < 0) {
      fail(
        `review-file has its containment line at ${String(review.guardAt)} and ` +
          `its first use of that value at ${String(review.firstUseAt)}. Both ` +
          `have to exist for the check to mean anything.`
      );
    } else if (review.guardAt > review.firstUseAt) {
      fail(
        `review-file uses $2 at line ${String(review.firstUseAt)} and does not ` +
          `check it until line ${String(review.guardAt)}. A check after the use ` +
          `is not a check.`
      );
    }
  }

  // 51. The new read, and the four properties the Explorer depends on.
  const tree = p903.treeList ?? null;
  if (tree === null) {
    fail(
      'the catalogue holds no script called tree-list, so the Explorer of a ' +
        'project on another machine has nothing to list rows from.'
    );
  } else {
    if (tree.mode !== 'read' || tree.params !== 3) {
      fail(
        `tree-list is a ${String(tree.mode)} taking ${String(tree.params)} ` +
          `value(s). It is a read taking three, being the folder, the depth and ` +
          `the cap.`
      );
    }
    if (!tree.prunesGit) {
      fail(
        'tree-list does not prune .git. A repository\'s internals would cross ' +
          'the link on every listing, and no surface in this product asks for ' +
          'them.'
      );
    }
    if (!tree.depthFromCaller) {
      fail(
        'tree-list does not read its depth from $2, so the walk is not bounded ' +
          'by what the caller asked for.'
      );
    }
    if (!tree.capped) {
      fail(
        'tree-list does not cap its output with head -n "$3". One folder ' +
          'holding a home directory would then send an answer of any size.'
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 46 to 48. Phase 84. The program search, the third environment name and the
// key Tortie made
// ---------------------------------------------------------------------------
//
// Every check below reads a compiled constant or a composed argv. None of them
// starts a process, opens a file under the person's home, or contacts a
// machine.

const p84 = data.phase84 ?? {};

{
  // 46. `program-find` walks two LISTS, and rule 2 of the catalogue says every
  //     positional is read as "$1" to "$9" and is always quoted. `for d in $2`
  //     would be a bare positional and rule 2 would be gone. So each list is
  //     read once, in quotes, into a local name, and the word splitting happens
  //     on that local name under IFS.
  const find = p84.programFind ?? null;
  if (find === null) {
    fail(
      'the catalogue holds no script called program-find, so an agent ' +
        'installed anywhere but a machine\'s login shell list cannot be found ' +
        'on it and a create of that agent is refused up front.'
    );
  } else {
    if (find.mode !== 'read' || find.params !== 3) {
      fail(
        `program-find is a ${String(find.mode)} taking ${String(find.params)} ` +
          `value(s). It is a read taking three, being the name, the machine's ` +
          `own list and the install folders.`
      );
    }
    if ((find.bareLoops ?? []).length > 0) {
      fail(
        `program-find walks a bare positional: ${find.bareLoops.join(', ')}. ` +
          `Every positional is read as "$1" to "$9" and is always quoted, and a ` +
          `loop over a bare one ends that rule for the whole catalogue.`
      );
    }
    for (const one of find.assignments ?? []) {
      if (one.at < 0) {
        fail(
          `program-find never reads its ${one.name} list into a local name. A ` +
            `list has to be read once, in quotes, before anything splits it.`
        );
      } else if (one.loopAt < 0) {
        fail(`program-find assigns ${one.name} and no loop walks it.`);
      } else if (one.at > one.loopAt) {
        fail(
          `program-find walks its ${one.name} list at byte ` +
            `${String(one.loopAt)} and assigns it at byte ${String(one.at)}, so ` +
            `the loop reads a name that has not been read yet.`
        );
      }
    }
    if (find.redirects !== 0) {
      fail(
        `program-find carries ${String(find.redirects)} redirection(s). It only ` +
          `asks whether a file is executable, so it writes nothing anywhere and ` +
          `redirects nothing at all.`
      );
    }
  }
}

{
  // 47. The set a person's safety is argued from. Phase 84 proposed a third
  //     name and step 17c of build/probe-execplane.mjs refused it: a pane takes
  //     its PATH from the server rather than from the session environment, so
  //     the pair would have crossed to another computer and changed nothing.
  //     An allowance nothing uses is a widening for nothing.
  const allowed = [...(p84.envAllowed ?? [])].sort();
  if (JSON.stringify(allowed) !== JSON.stringify(['GMUX_MANAGED', 'GMUX_SESSION_ID'])) {
    fail(
      `Tortie may put ${String(allowed.length)} name(s) on a session on another ` +
        `machine, being ${allowed.join(', ') || 'none'}. It is exactly the two ` +
        `identity variables. A value on a new-session line stands in two ` +
        `process tables at once for the life of the create, and no Linux ` +
        `machine has been measured for who can read them.`
    );
  }
  if (p84.envMeasuredAndRefused !== 'PATH') {
    fail(
      `the name Phase 84 measured and did not add reads ` +
        `${JSON.stringify(p84.envMeasuredAndRefused)}. It is PATH, and a round ` +
        `that changes this line has to read the measurement in ` +
        `src/main/machines/remote-env.ts first.`
    );
  }
  if (allowed.includes(String(p84.envMeasuredAndRefused))) {
    fail(
      `${String(p84.envMeasuredAndRefused)} is in the allowed set. Step 17c of ` +
        `build/probe-execplane.mjs measured that an -e pair for it does not ` +
        `reach a pane, so sending it would put a value on a command line on ` +
        `another computer for no effect at all.`
    );
  }
}

{
  // 48. The key the Install button writes, named on every command.
  //
  // Before Phase 84 that file was used by nothing: `IdentityFile` and a bare
  // `-i` appeared zero times under src/main/machines/, so every sign in
  // depended on whatever key the person happened to have loaded.
  const identity = p84.identity ?? {};
  const named = identity.named ?? [];
  if (named.length !== 1) {
    fail(
      `a command for a machine with a key names ${String(named.length)} ` +
        `identity file(s). It names exactly one, being the key Tortie made for ` +
        `that machine.`
    );
  } else {
    const value = String(named[0]).slice('IdentityFile='.length);
    if (value !== `"${identity.keyPath}"`) {
      fail(
        `the identity file option carries ${value} and Tortie's own key for ` +
          `that machine is at "${identity.keyPath}". Naming any other file ` +
          `would offer a key nobody agreed to.`
      );
    }
    if (!String(identity.keyPath ?? '').startsWith(String(identity.keyDir ?? '\u0000'))) {
      fail(
        `Tortie named ${identity.keyPath}, which is not inside the folder it ` +
          `keeps machine keys in, being ${identity.keyDir}.`
      );
    }
    if (!value.startsWith('"') || !value.endsWith('"')) {
      fail(
        'the identity file path is unquoted. The client reads that value as a ' +
          "list separated by spaces, and Tortie's own data directory has a " +
          'space in its name on every Mac.'
      );
    }
  }
  if ((identity.identitiesOnly ?? []).length > 0) {
    fail(
      'a command carries IdentitiesOnly. It is deliberately NOT set: it would ' +
        "tell the client to offer Tortie's key and nothing else, and the " +
        'operator\'s Mac Pro works today through a key he loaded himself. ' +
        'Tortie names its own key IN ADDITION to whatever the person has.'
    );
  }
  if ((identity.bareArgv ?? []).some((one) => String(one).includes('IdentityFile'))) {
    fail(
      'a command for a machine Tortie has made no key for still names an ' +
        'identity file. Naming a file that is not there makes the client print ' +
        'a warning on every command for nothing.'
    );
  }
}

process.stdout.write(
  `\nTortie may put ${String((p84.envAllowed ?? []).length)} environment name(s) on a ` +
    `session on another machine, being ${(p84.envAllowed ?? []).join(', ')}. ` +
    `${String(p84.envMeasuredAndRefused)} was measured and is not one of them, because a ` +
    `pane takes its list of folders from the server rather than from the session.\n`
);
process.stdout.write(
  `Tortie's own key for one machine is named as ` +
    `${(p84.identity?.named ?? []).join(', ') || '(nothing)'}, and IdentitiesOnly appears ` +
    `${String((p84.identity?.identitiesOnly ?? []).length)} time(s), so the person's own ` +
    `loaded keys are still offered.\n`
);

// ---------------------------------------------------------------------------
// Phase 69's tables
// ---------------------------------------------------------------------------

process.stdout.write(
  '\nverb                 repeat  kind          reason      guard\n'
);
process.stdout.write('-'.repeat(80) + '\n');
for (const row of data.ledger ?? []) {
  process.stdout.write(
    `${pad(row.verb, 20)} ${pad(row.repeat, 7)} ${pad(row.kind, 13)} ${pad(
      `${String(row.reasonLength)} chars`,
      11
    )} ${String(row.guard ?? '')}\n`
  );
}
process.stdout.write(
  `nothing else may cross to a machine. These ` +
    `${String((data.forbiddenVerbs ?? []).length)} are absent and stay absent: ` +
    `${(data.forbiddenVerbs ?? []).join(', ')}.\n`
);
process.stdout.write(
  `send-keys is on the ledger as the one unsafe row, and ` +
    `${String((data.armedResumeCallFiles ?? []).length)} file(s) may name the ` +
    `door that sends it: ${(data.armedResumeCallFiles ?? []).join(', ')}. The ` +
    `argv it composes is ${(data.armedResumeArgv ?? [])
      .slice(0, 4)
      .join(' ')} <text>, which is five elements and no key press.\n`
);
process.stdout.write(
  `the counter that decides whether it landed reads a wrapped screen as ` +
    `${String((data.armedResumeWrapCounts ?? {}).onceWrapped)} copy for one ` +
    `send, ${String((data.armedResumeWrapCounts ?? {}).twiceWrapped)} for two ` +
    `sends, and ${String((data.armedResumeWrapCounts ?? {}).absent)} for a ` +
    `screen holding only a prompt.\n`
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

// ---------------------------------------------------------------------------
// Phase 73's table
// ---------------------------------------------------------------------------

process.stdout.write('\nremote script   mode   values  bytes  quoting\n');
process.stdout.write('-'.repeat(56) + '\n');
for (const row of scriptVerdicts) {
  process.stdout.write(
    `${pad(row.id, 15)} ${pad(row.mode, 6)} ${pad(row.params, 7)} ${pad(
      row.bytes,
      6
    )} ${row.quoting}\n`
  );
}
process.stdout.write(
  `${String((run.writers ?? []).length)} of ${String(
    (run.scripts ?? []).length
  )} script(s) write, being ${(run.writers ?? []).join(', ')}. Nothing else ` +
    `Tortie sends to a machine can change a byte there.\n`
);
process.stdout.write(
  `the largest image the contract allows is ${String(
    run.imageMaxBytes
  )} bytes, which composes a ${String(
    run.biggestImageCommand?.bytes
  )} byte command against a ${String(run.maxBytes)} byte limit on one argument ` +
    `of a Linux login shell. That limit is the kernel's own constant and it was ` +
    `NOT measured here, because no Linux machine was contacted.\n`
);
process.stdout.write(
  `${String(
    scripts.reduce((sum, row) => sum + (row.gitCalls ?? []).length, 0)
  )} git command(s) run on a machine across the whole catalogue: ` +
    `${scripts
      .flatMap((row) =>
        (row.gitCalls ?? []).map(
          (call) =>
            `${row.id}:${call.verb}${
              READ_ONLY_GIT_VERBS.has(call.verb)
                ? ' (read)'
                : call.prompt && call.gcm
                  ? ' (no prompt)'
                  : ' (CAN PROMPT)'
            }`
        )
      )
      .join(', ')}. Only git-clone may name ${GIT_CLONE_VERBS.join(' or ')}.\n`
);
process.stdout.write(
  `execRemoteShell is called from ${String(
    (run.shellCallers ?? []).length
  )} file(s): ${(run.shellCallers ?? []).join(', ')}. The door in remote-run.ts ` +
    `is the only one that sends a catalogue script.\n`
);

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. A machine confirmation is bound to the five fields that decide what runs, to ' +
    'the prefixed id, and to nothing else. Nothing was started by this gate.\n'
);
