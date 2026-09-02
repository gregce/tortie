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
 * THE SEVENTY CONDITIONS IT FAILS ON. Each one is a way a person's agreement
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
 * THE NUMBERED LIST ABOVE STOPS AT 49 AND THE FILE HOLDS MORE. Phases 90.3, 98,
 * 100, 105 and 106 each added a condition and left the list where it was, so
 * this says so rather than quietly renumbering. Conditions 50 and 51 are Phase
 * 90.3's, 52 is Phase 98's, 53 is Phase 99's, 54 is Phase 100's, 55 is Phase
 * 105's and 56 is Phase 106's. Conditions 63 to 68 are Phase 89's, 69 to 73 are
 * Phase 117's, 74 to 78 are Phase 118's and 79 and 80 are Phase 101's, and the
 * last three sets are described at their own blocks at the foot of this file.
 * The numbers 60, 61 and 62 were never used. Seventy seven conditions are in
 * force, being 1 to 59 and 63 to 80:
 *
 * 55. `repo-facts` is not a one value read in the catalogue; it names a git verb
 *     other than `rev-parse`; `ALLOWED_GIT_VERBS` is not exactly `ls-files`,
 *     `rev-parse`, `show` and `status`; the script text or the bytes the door
 *     composes name any of `gh`, `GH_TOKEN`, `GITHUB_TOKEN`, `GH_HOST`,
 *     `Authorization`, `hosts.yml`, `.config/gh`, `netrc` or `curl`; the script
 *     names `--absolute-git-dir` or does not name `--git-common-dir`;
 *     `src/main/machines/remote-runs.ts` is absent, calls `runRemoteWrite`,
 *     makes more than one remote read, or names a script other than
 *     `repo-facts`; the catalogue's writers are not exactly `image-put` then
 *     `git-clone`; the catalogue does not hold fifteen scripts; or the gh argv
 *     that feature composes is refused by `assertReadOnlyArgv` or is not a
 *     `run list` naming `--repo`. THE FOURTH ITEM IS THE ONE THE FEATURE RESTS
 *     ON: gh runs on this Mac and never leaves it.
 *
 * 56. `repo-branch` is not a one value read in the catalogue; it names a git
 *     verb other than `rev-parse` and `for-each-ref`; the format inside its text
 *     plus `%(subject)` is not exactly `BRANCH_FORMAT` from
 *     `src/main/git/parse.ts`; `ALLOWED_GIT_VERBS` is not exactly
 *     the eight members of `ALLOWED_GIT_VERBS`; the script
 *     names `--absolute-git-dir` or does not name `--git-common-dir`; a hostile
 *     folder value reaches the script text or appears other than once and quoted
 *     in the composed command; the script names `git fetch`, `git pull` or
 *     `git remote update`; `src/main/machines/remote-branch.ts` is absent, calls
 *     `runRemoteWrite`, makes other than exactly one remote read, names a script
 *     other than `repo-branch`, or imports anything from `../actions/`; the
 *     catalogue's writers are not exactly `image-put`, `git-clone` then `file-put`;
 *     or the catalogue does not hold twenty two scripts (Phase 109 moved the
 *     count to nineteen, Phase 101 moved it to twenty and Phase 102 moved it to
 *     twenty two).
 *     TWO ITEMS CARRY THIS FEATURE.
 *     The format relation is what keeps one format in one place, and the fetch
 *     names are the executable form of the sentence telling a person that Tortie
 *     counted against a copy that machine already had and fetched nothing.
 *
 *  57. PHASE 107, being the commit graph of a folder on another machine. It
 *     fails when: the catalogue holds no `repo-history`, or holds it as
 *     anything but a read taking two values; that script names a git verb
 *     other than `log`, `merge-base`, `rev-list` and `rev-parse`;
 *     `ALLOWED_GIT_VERBS` is not exactly its eight members; the `--format=`
 *     literal inside the script is not `GRAPH_LOG_FORMAT` from
 *     `src/main/git/graph-parse.ts`; the script names `--absolute-git-dir` or
 *     does not name `--git-common-dir`; a hostile folder value reaches the
 *     script text or appears other than once and quoted in the composed
 *     command; the script names `git fetch`, `git pull` or `git remote update`;
 *     the script does not name `--branches`, `--tags` and `--remotes`, or names
 *     any of `--stdin`, `--all`, `refs/stash` and `refs/notes`;
 *     `src/main/machines/remote-history.ts` is absent, calls `runRemoteWrite`,
 *     makes other than exactly one remote read, names a script other than
 *     `repo-history`, imports anything from `../actions/`, or names
 *     `sanitizeRefNames`; `REMOTE_HISTORY_PAGE` is not 50 or
 *     `REMOTE_HISTORY_MAX_COMMITS` is not 500; the catalogue's writers are not
 *     exactly the five ids `ALLOWED_WRITERS` names, or it does not hold twenty two
 *     scripts (Phase 109 moved the count to nineteen, Phase 101 to twenty and
 *     Phase 102 to twenty two); `src/renderer/scm/remote-history.ts` names a timer; or
 *     `src/renderer/scm/RemoteHistorySection.tsx` does not name `hasMore`,
 *     `atCeiling` and `divergenceTruncated`. THREE ITEMS CARRY THIS FEATURE.
 *     The two constants are the executable form of the tier staying at 2,
 *     because a person who cannot ask for 20,000 commits cannot make main
 *     buffer 5,400,000 bytes in one answer. The three field names are the
 *     executable form of the Phase 99 honesty gap not repeating, because that
 *     phase carried a truncation flag through main that the panel never read
 *     and a cut list drew as a whole one. The ref name rules are the executable
 *     form of "no ref name is a value", which is what let the guard
 *     `sanitizeRefNames` stay on this side of the link instead of being written
 *     again in `sh`.
 *
 *  58. PHASE 108, being the Context of a folder on another machine. It fails
 *     when: the catalogue does not hold twenty two scripts (Phase 109 moved the count
 *     to nineteen, Phase 101 to twenty and Phase 102 to twenty two) with the
 *     writers exactly the five ids `ALLOWED_WRITERS` names; `context-read` is absent, or is
 *     anything but a read taking three values, or does not read its two lists
 *     into local names split under `IFS`, or names ANY git verb;
 *     `src/main/machines/remote-agent-context.ts` is absent, does not import
 *     `scanContext`, imports `agent-context` or `node:fs`, declares a location
 *     table of its own, or names a timer; `src/main/context/recording-fs.ts`
 *     is absent or imports from the machines domain;
 *     `src/renderer/context/store.ts` names a timer; `machine-facts` does not
 *     print `claude_config_dir`, `xdg_config_home` and `xdg_state_home`;
 *     `CONTEXT_READ_LIST_MAX_BYTES` is not 100,000,
 *     `CONTEXT_READ_FILE_MAX_BYTES` is not 33,554,432 or the `head -c`
 *     literal disagrees with it, `CONTEXT_READ_MAX_PASSES` is not 8, or
 *     `CONTEXT_ENUM_DEPTH` is not 2; or
 *     `src/renderer/context/ContextView.tsx` does not name
 *     `contextOnMachineLine`, `CONTEXT_NESTED_NOT_LISTED` and
 *     `contextCutLine`. THE IMPORT RULES ARE THE POINT: they are the
 *     executable form of "no second table" from research 57 i7 section 6.3,
 *     and `npm run conformance:context` proves the matrix itself.
 *
 *  59. PHASE 109, being the batched agent search. It fails when: the
 *     catalogue holds no `agents-find`, or holds it as anything but a read
 *     taking three values; any of its three lists is not read into a local
 *     name before the loop that walks it, or a loop walks a bare positional;
 *     it carries any redirection at all; it does not split folders under
 *     `IFS=:` and records under a newline `IFS`; it does not name the
 *     `unreadable` section; or any execute test in it, or in `program-find`,
 *     stands without a file test beside it. THE FILE TEST PAIR IS THE POINT:
 *     `[ -x ]` alone passed a DIRECTORY carrying the execute bit, and through
 *     `program-find` that path reached `argv[0]` and the manifest row, which
 *     is the source of truth for restore. Research 58 section 1.4 reproduced
 *     it against a real machine, and this is the condition that stops the two
 *     scripts ever disagreeing about a directory again.
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
import { tsxCli } from './ts-runner.mjs';

const probe = spawnSync(
  process.execPath,
  [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/machines-conformance-probe.mts'],
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
// PHASE 83. Read from a row carrying EVERY field. An appended field reaches the
// hash text only when it is set, so a row with nothing appended covers four keys
// on purpose, and condition 43 is what holds that half.
//
// PHASE 101 MOVED WHICH ROW THIS IS READ FROM. It read the accepted version
// row, which carries five of the six fields, so the sixth would have read as
// missing from the hash and this condition would have failed on a property that
// is true. It now reads the row carrying every field.
const hashedEverything =
  data.hashedKeysEverything ?? data.hashedKeysAccepted ?? data.hashedKeys;
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
  { name: 'the row is running', offered: false, refusal: 'running' },
  // PHASE 117. Four inputs for the third arm, and the last three are the
  // ones that decide where it may sit. A row whose create was never confirmed
  // ALWAYS reads `unknown`, because `remoteRecordStatus` gives it that status,
  // and the gate is asked about it before any list has completed and before
  // anybody has signed in to the machine. An arm placed below `not-ready`,
  // below `no-route` or below `unseen` never fires for the case it was written
  // for, and the person reads a sentence that does not name the risk of a
  // second agent on one conversation.
  { name: 'the create was never confirmed', offered: false, refusal: 'unconfirmed' },
  {
    name: 'the create was never confirmed and the row reads unknown',
    offered: false,
    refusal: 'unconfirmed'
  },
  {
    name: 'the create was never confirmed and no list has completed yet',
    offered: false,
    refusal: 'unconfirmed'
  },
  {
    name: 'the create was never confirmed and nobody signed in to it',
    offered: false,
    refusal: 'unconfirmed'
  }
];

// PHASE 117 PUT `unconfirmed` THIRD, and the position is the rule rather than a
// preference. Arms one and two are facts about the ROW, being a machine the
// person removed and a row that belongs to somewhere else, and this is the
// third and most consequential row fact: Tortie cannot say whether the session
// is running, so bringing it back could start a second agent on one
// conversation. Every arm below it is a fact about the LINK, and a link
// sentence sends the person to fix something that will not settle this row.
const REFUSAL_ORDER = [
  'forgotten',
  'wrong-machine',
  'unconfirmed',
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

// 43. The declared list is six, and the four Phase 68 fields still stand alone.
const declaredFields = [...(data.executionFields ?? [])];
if (declaredFields.length !== 6) {
  fail(
    `MACHINE_EXECUTION_FIELDS lists ${String(declaredFields.length)} field(s) ` +
      'and Phase 101 holds it at six.'
  );
}
if (!declaredFields.includes('writeRoot')) {
  fail(
    'MACHINE_EXECUTION_FIELDS does not carry writeRoot, so the field that ' +
      'decides which files on that machine Tortie may replace is not declared ' +
      'as one that decides what runs.'
  );
}
if (!declaredFields.includes('acceptedTmuxVersion')) {
  fail(
    'MACHINE_EXECUTION_FIELDS does not carry acceptedTmuxVersion, so the field ' +
      'that decides whether Tortie starts work on an unmeasured version is not ' +
      'declared as one that decides what runs.'
  );
}
// The four Phase 68 keys are everything the declared list holds MINUS every key
// the hash text appends. It was written as one named exclusion until Phase 101,
// which would have left `writeRoot` in this set and made the check assert the
// opposite of what it exists for.
const appendedFields = [...(data.writeRootFacts?.appendedFields ?? [])];
if (appendedFields.length === 0) {
  fail(
    'the probe printed no list of appended execution fields, so condition 43 ' +
      'has nothing to subtract and is checking a set it made up.'
  );
}
const phase68Keys = declaredFields
  .filter((field) => !appendedFields.includes(field))
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

// PHASE 101, FIX ROUND. The sixth execution field belongs in the table a
// person reads. Condition 79 below checks it and prints nothing of its own, so
// until this block the closing line said the hash is bound to six fields while
// the table listed five. The verdict is computed here from the same probe
// facts condition 79 reads, and condition 79 is what fails the run.
const writeRootVerdicts = [];
{
  const w = data.writeRootFacts ?? null;
  if (w === null) {
    writeRootVerdicts.push({
      field: 'writeRoot',
      kind: 'execution',
      moves: 'unread',
      verdict: 'FAIL'
    });
  } else {
    const ok =
      w.set !== w.unset && w.set !== w.setOther && w.backToUnset !== w.set;
    writeRootVerdicts.push({
      field: 'writeRoot',
      kind: 'execution',
      moves: ok ? 'yes' : 'NO',
      verdict: ok ? 'pass' : 'FAIL'
    });
  }
}

process.stdout.write('\nfield                kind          hash moves  verdict\n');
process.stdout.write('-'.repeat(60) + '\n');
for (const row of [...fieldVerdicts, ...acceptVerdicts, ...writeRootVerdicts]) {
  process.stdout.write(
    `${pad(row.field, 20)} ${pad(row.kind, 13)} ${pad(row.moves, 11)} ${row.verdict}\n`
  );
}

// PHASE 103 FIX ROUND. Conditions 42 and 79b write nothing on a pass, so a
// reader could only ever paste the word PASS for the one number this gate is
// built around. The computed hex is printed here beside the pinned one, so the
// evidence for "no machine anybody already confirmed is asked again" is a pair
// of hex strings a person can compare rather than a claim.
process.stdout.write('\nthe unaccepted machine hash, computed here and pinned\n');
process.stdout.write('-'.repeat(100) + '\n');
process.stdout.write(
  `computed, no accepted version, no write root: ${String(
    (data.writeRootFacts ?? {}).unset ?? (data.acceptedVersion ?? {}).unaccepted
  )}\n`
);
process.stdout.write(`pinned UNACCEPTED_HASH_2026_08_18:            ${UNACCEPTED_HASH_2026_08_18}\n`);
process.stdout.write(
  `computed, that row after the folder was cleared:  ${String(
    (data.writeRootFacts ?? {}).backToUnset ?? 'not printed by the probe'
  )}\n`
);

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
// 35 to 40. Phase 73. The second door, and the twenty two scripts it may send
// ---------------------------------------------------------------------------
//
// THIS HEADER SAID SEVEN UNTIL PHASE 101, and it is written out rather than
// quietly fixed. It was seven when Phase 73 wrote it. The catalogue held
// nineteen before Phase 101 and it holds twenty two now. That is defect 6 of
// research 57 section 9. Phase 102 moved it by two WRITES rather than by a
// read, and `ALLOWED_WRITERS` moved with it.
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

/**
 * The git verbs ANY script in the catalogue may name. ALL FIVE READ AND NONE OF
 * THEM REACHES A SERVER, and that is what this list is.
 *
 * The name says "allowed" and the membership test is narrower than that. Every
 * member is a pure read of the object database, the index or the ref store, and
 * none of them contacts anything over a network. `READ_ONLY_GIT_VERBS` below is
 * built straight from this list and is what exempts a verb from carrying
 * `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never`, which is only sound
 * because of that second property. A verb that reads but reaches a server does
 * not belong here.
 *
 * PHASE 98 ADDED `ls-files`. The remote search asks git which files are in the
 * folder and then reads them with the machine's own grep. Reading the index is
 * a read, it reaches no server, and it meets the same test the other three
 * meet. Phase 99, being Quick Open on a tab that lives on another machine,
 * needs the same verb and therefore needs no widening of its own.
 *
 * PHASE 106 ADDED `for-each-ref`, and it is the fifth. It reads the ref store
 * and it contacts nothing, so it meets the same test and takes the same
 * exemption. Research 57 section 5.5 proposed a fourth list named for read
 * verbs that touch no server. That list is this one, so this comment says what
 * the list is rather than starting a second one with the same members under a
 * better name. A rename of a safety list is its own round.
 *
 * PHASE 107 ADDED THREE, being `log`, `merge-base` and `rev-list`, and they are
 * the sixth, the seventh and the eighth. `log` walks the object database and
 * prints commits. `merge-base` reads two commits already in it and answers with
 * a third. `rev-list` walks the same database and prints commit names. None of
 * the three opens a network connection, none of them writes a ref, an index or
 * a working tree file, and none of them can be turned into a write by any flag
 * this catalogue passes. Research 57 section 5 priced the widening at four, and
 * it is three because `for-each-ref` joined this list in Phase 106 after that
 * research was written.
 */
const ALLOWED_GIT_VERBS = [
  'rev-parse',
  'status',
  'show',
  'ls-files',
  'for-each-ref',
  'log',
  'merge-base',
  'rev-list'
];

/** The eight members above, sorted, so three conditions read one list. */
const ALLOWED_GIT_VERBS_SORTED = [
  'for-each-ref',
  'log',
  'ls-files',
  'merge-base',
  'rev-list',
  'rev-parse',
  'show',
  'status'
];

/**
 * The extra git verbs each script id may name, and no other script may.
 *
 * PHASE 90.2 WIDENED THE LIST, once and on purpose, and bound the widening to
 * one script id. A verb allowed everywhere is a verb any future script can use.
 * `GIT_CLONE_VERBS` was that widening as a bare array.
 *
 * PHASE 103 TURNED IT INTO A MAP and added three, each bound to one id: `add`
 * in `git-stage` alone, and `restore` and `rm` in `git-unstage` alone.
 * `ALLOWED_GIT_VERBS` does NOT grow, because none of the three is a read of the
 * object database, the index or the ref store. `READ_ONLY_GIT_VERBS` is built
 * from `ALLOWED_GIT_VERBS`, so all three fall outside it and the first loop of
 * condition 49 demands `GIT_TERMINAL_PROMPT=0` and `GCM_INTERACTIVE=never` in
 * front of each one. Do not weaken that by adding them to the read set.
 *
 * PHASE 104 ADDED ONE, being `commit` in `git-commit` alone. It is one line
 * here because Phase 103 made this a map. `BOUND_GIT_VERBS` and both loops of
 * condition 49 pick it up with no further edit, and so does the `allowedVerbs`
 * list in condition 38. `ALLOWED_GIT_VERBS` does not grow, for the same reason:
 * a verb allowed everywhere is a verb any future script can use, and `commit`
 * is not a read.
 */
const EXTRA_GIT_VERBS = {
  'git-clone': ['ls-remote', 'clone'],
  'git-stage': ['add'],
  'git-unstage': ['restore', 'rm'],
  'git-commit': ['commit']
};

/** Every verb in that map, so the second loop of condition 49 reads one list. */
const BOUND_GIT_VERBS = Object.values(EXTRA_GIT_VERBS).flat();

/**
 * Every script that may write, in catalogue order.
 *
 * PHASE 90.2 MOVED THIS FROM ONE TO TWO, PHASE 101 MOVED IT FROM TWO TO THREE,
 * PHASE 102 MOVED IT FROM THREE TO FIVE, PHASE 103 MOVED IT FROM FIVE TO SEVEN
 * AND PHASE 104 MOVED IT FROM SEVEN TO EIGHT, once and on purpose each time. It
 * is the number that bounds what Tortie can do to another person's computer, so
 * it stays an exact allowlist and never becomes a count.
 *
 * `git-commit` IS LAST AND IT IS LAST ON PURPOSE. `biggestImageCommand` in
 * `build/machines-conformance-probe.mts` takes the FIRST row with
 * `mode: 'write'` and composes it with an image payload, so a write inserted
 * ahead of `image-put` would make condition 39 measure the wrong script.
 */
const ALLOWED_WRITERS = [
  'image-put',
  'git-clone',
  'file-put',
  'dir-new',
  'entry-rename',
  'git-stage',
  'git-unstage',
  'git-commit'
];

/**
 * The mutating program words each write script may name, per script id.
 *
 * PHASE 103 ADDED THIS AND IT IS A GENERAL RULE THE WRITE SIDE NEVER HAD.
 * `MUTATING_PROGRAMS` is consulted only inside `if (row.mode === 'read')`, and
 * until this phase every write had a hand written branch instead. Seven writes
 * is too many for that shape, so every write is now read against this map as
 * well as against its own branch.
 *
 * An empty array means the script may name none of the eleven.
 *
 * EVERY ROW WAS MEASURED AGAINST THE TREE RATHER THAN COPIED FROM THE PHASE'S
 * OWN TABLE, and two of them came back different. That table said `image-put`
 * names `mv` alone and `file-put` names `mv` alone. `image-put` also makes its
 * temporary directory and sets its mode, so it names `mkdir` and `chmod` as
 * well, and `file-put` sets the replaced file's mode, so it names `chmod`. The
 * measured sets are what is pinned here.
 */
const WRITE_MUTATORS = {
  'image-put': ['chmod', 'mkdir', 'mv'],
  'git-clone': [],
  'file-put': ['chmod', 'mv'],
  'dir-new': ['chmod', 'mkdir'],
  'entry-rename': ['mv'],
  'git-stage': [],
  'git-unstage': ['rm'],
  // PHASE 104. MEASURED by running the same filter this condition runs over the
  // real script text rather than read by eye. It names none of the eleven.
  'git-commit': []
};

/**
 * The per element guard the two Phase 103 writers carry, pinned byte for byte.
 *
 * It is the Phase 102 write line with three more shapes on it, being the empty
 * element, the single dot and a trailing slash. The single dot is the one that
 * matters most: `git add -A -- ":(literal)."` stages every change in that
 * repository in one call, which is not what any person pressing one row's
 * button asked for.
 *
 * It is defined here rather than beside `WRITE_PATH_GUARD` at condition 50
 * because condition 38 reads it, and a `const` read before its own line throws.
 */
const INDEX_PATH_GUARD =
  "case \"$p\" in ''|.|/*|*..*|*/|.git|.git/*|*/.git|*/.git/*) exit 1;; esac";

/**
 * How many scripts the catalogue holds. Twenty five.
 *
 * Four later conditions pinned this number as a literal `19` each. Phase 101
 * made them one constant, because four copies of one number is how three of
 * them go stale. Phase 102 moved it from twenty to twenty two by two WRITES,
 * Phase 103 moved it from twenty two to twenty four by two more, and Phase 104
 * moved it from twenty four to twenty five by one more.
 */
const REMOTE_SCRIPT_COUNT = 25;

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
        `number that bounds what Tortie can do to another person's computer. ` +
        `Phase 90.2 moved it from one to two, Phase 101 moved it from two to ` +
        `three and Phase 102 moved it from three to five, once and on purpose ` +
        `each time.`
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
    } else if (row.id === 'file-put') {
      // PHASE 101. The third write, and its own five rules. It is the first
      // command this product sends that can replace a file a person already
      // had, so it carries the image rule about redirection plus three rules
      // about containment and one about what it may not name.
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
            `part file rather than half a file under the real name.`
        );
      }
      if (!row.text.includes('mv "$t" "$f"')) {
        fail(
          `write script ${row.id} does not move its temporary name into place, ` +
            `so either it writes the real name directly or it leaves the part ` +
            `file behind.`
        );
      }
      // TWO containment lines for the root and one for the path under it. The
      // line copied from REVIEW_FILE guards `$2` only, and `$1` is the folder
      // the whole write is bounded by, so it gets its own two.
      for (const line of [
        'case "$1" in /*) ;; *) exit 1;; esac',
        'case "$1" in *..*) exit 1;; esac',
        'case "$2" in /*|*..*) exit 1;; esac'
      ]) {
        if (row.text.includes(line)) continue;
        fail(
          `write script ${row.id} does not carry the containment line ` +
            `${JSON.stringify(line)}. The far side holds its own copy of ` +
            `containment so that the rule still holds when main's copy is ` +
            `bypassed.`
        );
      }
      if (!row.text.includes('if [ -f "$f" ]; then')) {
        fail(
          `write script ${row.id} does not test whether the file is already ` +
            `there on its new arm. That test is what stops a request to make a ` +
            `file ever replacing one somebody already had.`
        );
      }
      // WRITTEN AS "the text does not name rm" AND NEVER AS "names no program
      // that removes a file". `mv` is one of the eleven names in
      // MUTATING_PROGRAMS, this script must name `mv`, and a builder
      // implementing the loose sentence would write a condition this script
      // cannot pass. MUTATING_PROGRAMS is consulted only inside the read arm
      // above and it does not apply here.
      if ((row.words ?? []).includes('rm')) {
        fail(
          `write script ${row.id} names rm. It replaces a file and it never ` +
            `removes one, and a remove in this text would be a delete on ` +
            `somebody else's computer that nobody asked for.`
        );
      }
    } else if (row.id === 'dir-new') {
      // PHASE 102. The fourth write, and the first one whose rule is that it
      // carries NO redirection at all. The regex the probe uses drops any `>`
      // that a `2` sits in front of, so an empty list here means no redirection
      // except the two `2>/dev/null` on the mode reads.
      if ((row.redirects ?? []).length > 0) {
        fail(
          `write script ${row.id} redirects to ${row.redirects.join(', ')}. It ` +
            `makes one folder and writes no bytes at all, so the only ` +
            `redirection it may carry is the kind a 2 sits in front of.`
        );
      }
      if (!row.text.includes('if [ -e "$d" ]; then')) {
        fail(
          `write script ${row.id} does not test its destination with -e before ` +
            `it makes anything. That test is what makes it safe to run twice, ` +
            `and it is what stops it ever touching a folder a person already ` +
            `had.`
        );
      }
      if (!row.text.includes('mkdir "$d"')) {
        fail(
          `write script ${row.id} does not run mkdir "$d", so this gate cannot ` +
            `tell what it makes.`
        );
      }
      if (row.text.includes('mkdir -p')) {
        fail(
          `write script ${row.id} names mkdir -p. A recursive make would create ` +
            `folders nobody named, on somebody else's computer.`
        );
      }
      // The mode is capped at two literals and nothing else can be produced.
      // A copy of the parent's mode with no ceiling would let a parent at 777
      // produce a Tortie made folder at 777, and a parent carrying a set group
      // id bit would pass that bit on.
      const chmods = [...row.text.matchAll(/chmod [^\n]*/g)].map(
        (hit) => hit[0] ?? ''
      );
      const wanted = ['chmod 755 "$d";;', 'chmod 700 "$d";;'];
      if (JSON.stringify(chmods) !== JSON.stringify(wanted)) {
        fail(
          `write script ${row.id} runs ${chmods.join(' and ') || 'no chmod'}. ` +
            `It runs exactly ${wanted.join(' and ')}, each once, so the only ` +
            `two modes it can produce are 755 and 700 and no set user id or set ` +
            `group id bit can be produced at all.`
        );
      }
      const named = [
        ...new Set((row.words ?? []).filter((word) =>
          MUTATING_PROGRAMS.includes(word)
        ))
      ].sort();
      if (JSON.stringify(named) !== JSON.stringify(['chmod', 'mkdir'])) {
        fail(
          `write script ${row.id} names ${named.join(', ') || 'no'} mutating ` +
            `program(s). It names exactly mkdir and chmod. MUTATING_PROGRAMS is ` +
            `consulted only inside the read arm above, so a write is bounded by ` +
            `its own branch here rather than by that list.`
        );
      }
    } else if (row.id === 'entry-rename') {
      // PHASE 102. The fifth write. It moves one entry and it writes no bytes,
      // so it takes `dir-new`'s redirection rule.
      //
      // WHAT THIS BRANCH CANNOT CHECK, said out loud rather than left implied.
      // Between the destination test and the `mv` another writer on that
      // machine can create the destination, and the `mv` then replaces it. This
      // gate reads text and cannot see a race. What it checks is that the text
      // tests before it moves.
      if ((row.redirects ?? []).length > 0) {
        fail(
          `write script ${row.id} redirects to ${row.redirects.join(', ')}. It ` +
            `moves one entry and writes no bytes at all, so the only ` +
            `redirection it may carry is the kind a 2 sits in front of.`
        );
      }
      if (!row.text.includes('[ -e "$t" ]')) {
        fail(
          `write script ${row.id} does not test its destination with -e. That ` +
            `test is what tells a repeat of Tortie's own move apart from a ` +
            `destination somebody else holds.`
        );
      }
      if (!row.text.includes('mv "$s" "$t"')) {
        fail(
          `write script ${row.id} does not run mv "$s" "$t", so this gate ` +
            `cannot tell what it moves.`
        );
      }
      if (row.text.includes('mv -f')) {
        fail(
          `write script ${row.id} names mv -f. The whole of what makes this ` +
            `script safe is that it decides before it moves.`
        );
      }
      const testAt = row.text.indexOf('[ -e "$t" ]');
      const moveAt = row.text.indexOf('mv "$s" "$t"');
      if (testAt < 0 || moveAt < 0 || testAt > moveAt) {
        fail(
          `write script ${row.id} tests its destination at ${String(testAt)} ` +
            `and moves at ${String(moveAt)}. A test after the move is not a ` +
            `test.`
        );
      }
      const namedMv = [
        ...new Set((row.words ?? []).filter((word) =>
          MUTATING_PROGRAMS.includes(word)
        ))
      ].sort();
      if (JSON.stringify(namedMv) !== JSON.stringify(['mv'])) {
        fail(
          `write script ${row.id} names ${namedMv.join(', ') || 'no'} mutating ` +
            `program(s). It names exactly mv. A rename does not copy, does not ` +
            `remove and does not change a mode.`
        );
      }
    } else if (row.id === 'git-stage' || row.id === 'git-unstage') {
      // PHASE 103. The sixth and the seventh writes, and the first two that
      // change a git repository on another computer. They share one branch
      // because they share one head, and everything below is read out of the
      // text rather than asserted in a comment.
      //
      // WHAT THIS BRANCH CANNOT CHECK, said out loud rather than left implied.
      // `$1` is the REPOSITORY ROOT and not the folder the person confirmed, so
      // neither text can bound the repository by that folder the way file-put,
      // dir-new and entry-rename all can. `src/main/machines/remote-stage.ts`
      // makes that check on this Mac and condition 84 reads its shape.
      for (const target of row.redirects ?? []) {
        if (target === '/dev/null') continue;
        fail(
          `write script ${row.id} redirects to ${target}. Every redirection in ` +
            `it has to aim at /dev/null, because the only thing it writes is ` +
            `the index git writes and everything else it reads is thrown away.`
        );
      }
      // THE LIST SHAPE. Rule 2 of the catalogue header says a script that walks
      // a LIST reads the whole list into a local name first, in quotes, and
      // splits that local name under IFS. NOTHING ELSE IN THIS GATE WOULD STOP
      // a later edit turning `for p in $l` into `for p in $2`: condition 46 is
      // bound to program-find by id, and condition 36 walks row.positionals
      // alone, which are the $1 to $9 reads, so a local name is not tested as a
      // positional at all.
      if (!row.text.includes('l="$2"')) {
        fail(
          `write script ${row.id} never reads its list into a local name. A ` +
            `list has to be read once, in quotes, before anything splits it.`
        );
      }
      if (!row.text.includes('for p in $l')) {
        fail(
          `write script ${row.id} does not walk its list as "for p in $l", so ` +
            `this gate cannot tell what it splits.`
        );
      }
      if (/for\s+[A-Za-z_][A-Za-z0-9_]*\s+in\s+\$[0-9]/.test(row.text)) {
        fail(
          `write script ${row.id} walks a bare positional. Every positional is ` +
            `read as "$1" to "$9" and is always quoted, and a loop over a bare ` +
            `one ends that rule for the whole catalogue.`
        );
      }
      // THE GUARD, OVER THE WHOLE LIST, ABOVE THE cd AND ABOVE EVERY GIT. A bad
      // element has to refuse the whole call rather than stage half of it, and
      // `git add -A -- ":(literal)."` would stage every change in that
      // repository in one call.
      const guardAt = row.text.indexOf(INDEX_PATH_GUARD);
      if (guardAt < 0) {
        fail(
          `write script ${row.id} does not carry the per element guard ` +
            `${JSON.stringify(INDEX_PATH_GUARD)}. The far side holds its own ` +
            `copy of containment so that the rule still holds when main's copy ` +
            `is bypassed.`
        );
      }
      const cdAt = row.text.indexOf('cd "$r"');
      const firstGitAt = row.text.indexOf('git ');
      if (cdAt < 0) {
        fail(`write script ${row.id} never changes into the repository root.`);
      }
      if (guardAt >= 0 && (cdAt < 0 || guardAt > cdAt)) {
        fail(
          `write script ${row.id} guards its list at ${String(guardAt)} and ` +
            `changes directory at ${String(cdAt)}. A guard after the cd is a ` +
            `guard that decides nothing.`
        );
      }
      if (guardAt >= 0 && (firstGitAt < 0 || guardAt > firstGitAt)) {
        fail(
          `write script ${row.id} guards its list at ${String(guardAt)} and ` +
            `runs its first git at ${String(firstGitAt)}. A bad element has to ` +
            `refuse the whole call rather than stage half of it.`
        );
      }
      // EVERY PATH REACHES GIT BEHIND :(literal). It is what literalSpec in
      // src/main/git/service.ts already does for a local path, so a name
      // holding * or [ cannot glob.
      if (!row.text.includes('set -- "$@" ":(literal)$p"')) {
        fail(
          `write script ${row.id} does not attach :(literal) to each path with ` +
            `set -- "$@" ":(literal)$p". A name holding * or [ would then glob ` +
            `on that machine.`
        );
      }
      // AN EMPTY LIST RUNS NO GIT AT ALL, so no git ever sees a bare --.
      if (!row.text.includes('[ "$#" -gt 0 ] || exit 1')) {
        fail(
          `write script ${row.id} does not refuse an empty list, so a call ` +
            `naming nothing would reach git with a bare --.`
        );
      }
      // NO DESTINATION TEST, and that is the point rather than an omission.
      // These two name no destination at all: they hand pathspecs to that
      // machine's own git and git decides what to write.
      if (row.text.includes('-e "$')) {
        fail(
          `write script ${row.id} carries a destination test. It names no ` +
            `destination, so a test on one would be testing something this ` +
            `script does not write.`
        );
      }
      // THE VERBS, BOUND TO ONE ID EACH.
      if (row.id === 'git-stage') {
        if (!row.text.includes('git add -A -- "$@"')) {
          fail(
            'write script git-stage does not run git add -A -- "$@", so this ' +
              'gate cannot tell what it puts in the index.'
          );
        }
        for (const other of ['restore', 'rm', 'commit', 'checkout', 'reset']) {
          if (!(row.gitVerbs ?? []).includes(other)) continue;
          fail(
            `write script git-stage names git ${other}. It names git add and ` +
              `nothing else that writes.`
          );
        }
      } else {
        const restoreAt = row.text.indexOf('git restore --staged -- "$@"');
        const rmAt = row.text.indexOf('git rm --cached -r -q -- "$@"');
        if (restoreAt < 0 || rmAt < 0) {
          fail(
            'write script git-unstage does not run both git restore --staged ' +
              'and git rm --cached over its list, so this gate cannot tell ' +
              'what it takes out of the index.'
          );
        } else if (restoreAt > rmAt) {
          fail(
            'write script git-unstage runs git rm --cached before git restore ' +
              '--staged. The rm is the unborn branch fallback and it may only ' +
              'run after the restore has failed.'
          );
        }
      }
    } else if (row.id === 'git-commit') {
      // PHASE 104. The eighth write, and the third that changes a git
      // repository on another computer.
      //
      // ITS REDIRECTION RULE IS WEAKER THAN image-put's AND THAT IS STATED
      // RATHER THAN HIDDEN. The redirect reader in the probe matches
      // `/(?<!2)>\s*([^\s;|)]+)/g`, so it counts neither `2>/dev/null` nor
      // `2>&1` nor `</dev/null`. Run over this script's text it returns an
      // empty list. A rule quantified over an empty list asserts nothing and
      // would be this gate's first vacuous write rule, so this branch asserts
      // that the list is EMPTY, which is a true and specific property of this
      // write. `image-put`'s rule names the exact target every redirection must
      // aim at and this one cannot.
      if ((row.redirects ?? []).length > 0) {
        fail(
          `write script ${row.id} redirects to ${row.redirects.join(', ')}. It ` +
            `makes a commit and writes no bytes of its own at all, so the only ` +
            `redirection it may carry is the kind a 2 sits in front of and the ` +
            `one that reads from /dev/null.`
        );
      }
      // STANDARD INPUT IS /dev/null. This is the one visible half of the
      // signing hazard: a passphrase program that reads a terminal fails at
      // once instead of holding the link open until the deadline.
      if (!row.text.includes('</dev/null')) {
        fail(
          `write script ${row.id} does not close its standard input with ` +
            `</dev/null. Without it a program asking for a passphrase on a ` +
            `computer nobody is looking at holds the connection until the ` +
            `deadline.`
        );
      }
      // THE HEAD GUARD. It is what makes this write safe to run twice, and it
      // is the only one of the eight writes whose safety is a guard it carries
      // itself rather than a destination test or an end state.
      if (!row.text.includes('if [ "$h" != "$2" ]; then')) {
        fail(
          `write script ${row.id} does not compare the sha Tortie read against ` +
            `the sha that machine holds. That comparison is the whole of what ` +
            `makes a commit safe to run twice, because running one twice would ` +
            `add two commits.`
        );
      }
      // WHAT THE MACHINE'S OWN WORDS ARE CAPPED AT, in the text rather than
      // only in a constant. Condition 86g proves this number equals the one in
      // src/main/machines/remote-commit.ts.
      if (!row.text.includes('head -c 8192')) {
        fail(
          `write script ${row.id} does not cap what that machine says with ` +
            `head -c 8192. A hook can print anything, and without the cap that ` +
            `output crosses the link whole.`
        );
      }
      // THE VERB, AND THE FOUR FLAGS THAT WOULD MAKE IT SOMETHING ELSE. The
      // test is PER LINE and anchored on a word boundary, so `head -c 8192`
      // elsewhere in the text cannot be read as `-a`.
      if (!row.text.includes('git commit -m "$3"')) {
        fail(
          'write script git-commit does not run git commit -m "$3", so this ' +
            'gate cannot tell what it commits or what message it uses.'
        );
      }
      for (const line of row.text.split('\n')) {
        if (!line.includes('git commit')) continue;
        for (const flag of [/\s--amend\b/, /\s--no-verify\b/, /\s-a\b/, /\s--all\b/]) {
          if (!flag.test(line)) continue;
          fail(
            `write script git-commit runs git commit matching ${flag.source} ` +
              `on the line ${JSON.stringify(line.trim())}. An amend rewrites a ` +
              `commit that may already have left that machine, --no-verify ` +
              `skips the person's own hooks, and -a or --all commits files ` +
              `nobody staged.`
          );
        }
      }
      // THE UNBORN BRANCH IS A STATE AND NOT A SPECIAL CASE, and it is only a
      // state when BOTH rev-parse calls carry --verify --quiet. This is
      // measured rather than reasoned. A bare `git rev-parse HEAD` in a
      // repository with no commit yet PRINTS THE WORD `HEAD` on standard
      // output and exits 1, so `h` is never empty, the `-z` guard never fires,
      // `h` never becomes `none`, and the far side answers `moved none HEAD`
      // having committed nothing. `git rev-parse --verify --quiet HEAD` prints
      // nothing at all in that repository, prints the sha otherwise, and
      // writes zero bytes to standard error either way, measured on git
      // 2.50.1. The first shipped draft of this script carried the bare form
      // and a first commit could never be made on another machine.
      for (const line of row.text.split('\n')) {
        if (!line.includes('git rev-parse')) continue;
        if (line.includes('--verify') && line.includes('--quiet')) continue;
        fail(
          `write script git-commit runs git rev-parse without --verify ` +
            `--quiet on the line ${JSON.stringify(line.trim())}. The bare form ` +
            `prints the word HEAD in a repository with no commit yet, so the ` +
            `empty test never fires, the guard value never becomes none, and ` +
            `a first commit on another machine can never be made.`
        );
      }
      // IT MAKES NO FILE OF ITS OWN OVER THERE. The message rides as -m and
      // never through -F, so the only thing this write writes is the commit.
      if (/(^|[\s;|&(])-F\b/.test(row.text)) {
        fail(
          `write script ${row.id} names -F. The message rides as -m so this ` +
            `write creates no temporary file on that machine, and the only ` +
            `thing it writes is the commit.`
        );
      }
      // NO IDENTITY TORTIE CHOSE. The commit is made under that machine's own
      // git configuration and never under a name this product composed.
      for (const name of ['GIT_AUTHOR_', 'GIT_COMMITTER_']) {
        if (!row.text.includes(name)) continue;
        fail(
          `write script ${row.id} names ${name}. The commit is made under that ` +
            `person's own git configuration on that machine, and never under an ` +
            `identity Tortie chose.`
        );
      }
    } else {
      fail(
        `write script ${row.id} has no redirection rule of its own in this ` +
          `gate. Every write carries its own rule, because two writes of ` +
          `different shapes cannot share one.`
      );
    }
    // PHASE 103. THE GENERAL MUTATOR RULE FOR WRITES, which the write side
    // never had. MUTATING_PROGRAMS is consulted only inside the read arm above,
    // and until this phase every write was bounded by its own hand written
    // branch alone. Seven writes is too many for that shape, so every write is
    // read against WRITE_MUTATORS as well.
    //
    // Without this, the only general rule standing between a future write
    // script and `rm -rf` would be the discard condition, which is worded
    // around git verbs.
    if (row.mode === 'write') {
      const allowedMutators = WRITE_MUTATORS[row.id];
      if (allowedMutators === undefined) {
        fail(
          `write script ${row.id} has no entry in WRITE_MUTATORS, so nothing ` +
            `bounds which of the eleven mutating programs it may name.`
        );
      } else {
        const named = [
          ...new Set(
            (row.words ?? []).filter((word) => MUTATING_PROGRAMS.includes(word))
          )
        ].sort();
        const wanted = [...allowedMutators].sort();
        if (JSON.stringify(named) !== JSON.stringify(wanted)) {
          fail(
            `write script ${row.id} names ${named.join(', ') || 'no'} mutating ` +
              `program(s) and WRITE_MUTATORS allows ` +
              `${wanted.join(', ') || 'none'}.`
          );
        }
        // THE rm EXCEPTION IS SATISFIED ONLY BY `git rm ... --cached`. Without
        // this the word would be allowed bare, and a bare rm on somebody
        // else's computer is the one thing this catalogue must never hold.
        if (named.includes('rm')) {
          for (const line of row.text.split('\n')) {
            if (!/\brm\b/.test(line)) continue;
            if (line.includes('git rm ') && line.includes('--cached')) continue;
            fail(
              `write script ${row.id} names rm on the line ` +
                `${JSON.stringify(line.trim())}. The only rm this catalogue ` +
                `may hold is git rm carrying --cached, which removes the index ` +
                `entry and leaves the file in the folder.`
            );
          }
        }
      }
    }
    // PHASE 90.2. The eight read verbs are allowed everywhere. The extra ones
    // each script needs are allowed in that one script and nowhere else.
    // PHASE 103 turned the one ternary into a lookup in EXTRA_GIT_VERBS.
    const allowedVerbs = [
      ...ALLOWED_GIT_VERBS,
      ...(EXTRA_GIT_VERBS[row.id] ?? [])
    ];
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
      if (!BOUND_GIT_VERBS.includes(verb)) continue;
      const owner = Object.keys(EXTRA_GIT_VERBS).find((id) =>
        EXTRA_GIT_VERBS[id].includes(verb)
      );
      if (row.id === owner) continue;
      fail(
        `remote script ${row.id} names git ${verb}. Only ${String(owner)} may ` +
          `name it, because a verb allowed everywhere is a verb any future ` +
          `script can use.`
      );
    }
  }
  for (const [id, verbs] of Object.entries(EXTRA_GIT_VERBS)) {
    process.stdout.write(
      `only ${id} may name git ${verbs.join(' or ')}\n`
    );
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

/**
 * The WIDER line the two Phase 102 writers carry, once per guarded value.
 *
 * `docs/research/57-i3-file-writes.md` section 12 rules this exact string for a
 * write. It is `REVIEW_FILE_GUARD` plus a `.git` half, and that half is what
 * stops a write ever reaching a repository's internals on somebody else's
 * machine.
 *
 * IT IS NOT ON `file-put`, AND THAT IS SAID HERE RATHER THAN LEFT IMPLIED.
 * Phase 101 shipped `file-put` carrying `REVIEW_FILE_GUARD`, with pinned
 * literals in condition 38 and its own probe. Phase 102 does not widen a
 * shipped writer, so `.git` is guarded on `dir-new` and `entry-rename` and not
 * on `file-put`. Widening that one is its own round.
 *
 * `%s` is not in it and neither is any parameter beyond the one it names, so
 * there are two constants rather than one: the line names the value it guards
 * and `entry-rename` guards two values.
 */
const WRITE_PATH_GUARD =
  'case "%s" in /*|*..*|.git|.git/*|*/.git|*/.git/*) exit 1;; esac';

/** The write line for one positional, e.g. `$2`. */
const writeGuardFor = (name) => WRITE_PATH_GUARD.replace('%s', name);

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

  // 50b. PHASE 102. The two writers' own containment lines, compared byte for
  //      byte against the wider write constant, and each one standing ABOVE the
  //      first line that uses the value it guards.
  //
  //      `dir-new` guards `$2`. `entry-rename` guards `$2` and `$3`, and the two
  //      are checked separately, because a line that guards one value says
  //      nothing about the other. A rename whose destination was unguarded would
  //      move a person's file to `.git/config` on their own machine.
  const p102 = data.phase102 ?? {};
  const guarded = p102.guards ?? [];
  const WANTED_GUARDS = [
    { id: 'dir-new', value: '$2' },
    { id: 'entry-rename', value: '$2' },
    { id: 'entry-rename', value: '$3' }
  ];
  if (guarded.length !== WANTED_GUARDS.length) {
    fail(
      `the probe printed ${String(guarded.length)} containment line(s) for the ` +
        `two Phase 102 writers and there are ${String(WANTED_GUARDS.length)}, ` +
        `being $2 of dir-new and $2 and $3 of entry-rename. A guarded value ` +
        `nothing reads is a guard nothing checks.`
    );
  }
  for (const wanted of WANTED_GUARDS) {
    const row = guarded.find(
      (one) => one.id === wanted.id && one.value === wanted.value
    );
    if (row === undefined) {
      fail(
        `the probe printed no containment line for ${wanted.value} of ` +
          `${wanted.id}, so nothing is checking the value that names what gets ` +
          `written on another person's computer.`
      );
      continue;
    }
    const want = writeGuardFor(wanted.value);
    if (row.guard !== want) {
      fail(
        `${wanted.id} carries ${JSON.stringify(row.guard)} where its ` +
          `containment line for ${wanted.value} should be. It is exactly ` +
          `${JSON.stringify(want)}. This is the WIDER write line from research ` +
          `57 i3 section 12, and the .git half of it is what stops a write ` +
          `reaching a repository's internals on somebody else's machine.`
      );
    }
    if (row.guardAt < 0 || row.firstUseAt < 0) {
      fail(
        `${wanted.id} has its containment line for ${wanted.value} at ` +
          `${String(row.guardAt)} and its first use of that value at ` +
          `${String(row.firstUseAt)}. Both have to exist for the check to mean ` +
          `anything.`
      );
    } else if (row.guardAt > row.firstUseAt) {
      fail(
        `${wanted.id} uses ${wanted.value} at line ${String(row.firstUseAt)} ` +
          `and does not check it until line ${String(row.guardAt)}. A check ` +
          `after the use is not a check.`
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
// 52. Phase 98. The search that runs on the machine rather than on this Mac
// ---------------------------------------------------------------------------
//
// Research 57 section 2 measured this and refused two of the three ways of
// doing it. Sending a ripgrep to the machine buys 0.15 s and costs a third
// write door, a transfer protocol, a binary per architecture and a Tortie
// placed executable on somebody else's computer. Copying the files here costs
// 2.4 s of link time against 0.176 s of scanning in place. So one read script
// crosses and the machine's own grep reads its own disk.
//
// Every check below reads the compiled script text and one compiled number. It
// sends nothing, starts nothing and contacts no machine.

const P98_FORBIDDEN = 'ripgrep, rg, curl, scp or install';

{
  const search = (data.phase98 ?? {}).repoSearch ?? null;
  if (search === null) {
    fail(
      'the catalogue holds no script called repo-search, so the Search view of ' +
        'a project on another machine has nothing to ask.'
    );
  } else {
    // 52a. A search that is not in the catalogue cannot be sent at all.
    if (search.mode !== 'read' || search.params !== 5) {
      fail(
        `repo-search is a ${String(search.mode)} taking ` +
          `${String(search.params)} value(s). It is a read taking five, being ` +
          `the folder, the pattern, the flag letters, the match cap plus one ` +
          `and the per line character cap.`
      );
    }
    // 52b. The two verbs it may name, and no third one a later edit adds here.
    const verbs = [...(search.gitVerbs ?? [])].sort();
    if (JSON.stringify(verbs) !== JSON.stringify(['ls-files', 'rev-parse'])) {
      fail(
        `repo-search names git ${verbs.join(', ') || 'nothing'}. It names ` +
          `exactly rev-parse, to ask whether the folder is a repository, and ` +
          `ls-files, to ask which files are in it. Both are reads and neither ` +
          `reaches a server.`
      );
    }
    // 52c. The caps are in the text and not in a caller.
    if (search.branches !== 2) {
      fail(
        `repo-search pipes a file list into grep on ${String(search.branches)} ` +
          `line(s). There are exactly two, being the repository branch and the ` +
          `walk branch, and every cap below is checked on both.`
      );
    }
    if (search.branchesCapped !== search.branches) {
      fail(
        `${String(search.branchesCapped)} of ${String(search.branches)} ` +
          `branch(es) of repo-search carry head -n "$4". A branch without it ` +
          `would send every matching line in a repository in one answer.`
      );
    }
    if (search.branchesClamped !== search.branches) {
      fail(
        `${String(search.branchesClamped)} of ${String(search.branches)} ` +
          `branch(es) of repo-search carry cut -c "1-$5". A minified bundle ` +
          `produces a 7 MB line, measured at 6,952,086 bytes by research 19, ` +
          `and one such line would fill the answer on its own.`
      );
    }
    // 52d. Two copies of one number is how one of them goes stale.
    const caps = search.byteCaps ?? [];
    if (caps.length !== search.branches) {
      fail(
        `repo-search carries ${String(caps.length)} head -c cap(s) and has ` +
          `${String(search.branches)} branch(es). Each branch ends at the size ` +
          `ceiling or it does not have one.`
      );
    }
    for (const cap of caps) {
      // ONE BYTE PAST THE CEILING, and that byte is the proof. A `head -c` that
      // stopped AT the ceiling cannot tell a stream of exactly that size from a
      // stream that was cut, and the answer would then be a guess.
      if (cap === search.declaredMaxBytes + 1) continue;
      fail(
        `repo-search reads ${String(cap)} bytes and REMOTE_SEARCH_MAX_BYTES ` +
          `reads ${String(search.declaredMaxBytes)}, so it should read ` +
          `${String(search.declaredMaxBytes + 1)}. The script text and the ` +
          `exported number are two copies of one ceiling, and this is the ` +
          `check that keeps them one value.`
      );
    }
    // 52h. The far side ANSWERS whether it cut, rather than leaving this end to
    // infer it from the last byte of the body.
    const tests = search.cutTests ?? [];
    if (tests.length !== 1 || tests[0] !== search.declaredMaxBytes) {
      fail(
        `repo-search compares the bytes it read against ` +
          `${tests.length === 0 ? 'nothing' : tests.join(', ')}. It compares ` +
          `them against ${String(search.declaredMaxBytes)} exactly once, and ` +
          `that comparison is the only thing that makes the cut an answer ` +
          `rather than a guess about the last byte of the body.`
      );
    }
    if (search.answerWords !== 3) {
      fail(
        `repo-search prints ${String(search.answerWords)} word(s) between the ` +
          `markers. It prints three, being the mode, the cut answer and the ` +
          `body. Inferring the cut from the body ends a result set early and ` +
          `calls it complete.`
      );
    }
    // 52e. A repository's internals never cross the link.
    if (!search.prunesGit) {
      fail(
        'the walk branch of repo-search does not prune .git. A folder that is ' +
          'not a repository can still hold one below it, and no surface in ' +
          'this product asks for a repository\'s internals.'
      );
    }
    // 52f. A query that starts with a dash is a query.
    const calls = search.grepCalls ?? [];
    if (calls.length === 0) {
      fail('repo-search runs no grep at all, so it cannot be searching anything.');
    }
    for (const call of calls) {
      if (call.includes('-e "$2"')) continue;
      fail(
        `repo-search runs ${JSON.stringify(call.trim())} without -e "$2". The ` +
          `pattern has to ride behind -e, or a person searching for -v would ` +
          `hand grep a flag instead of a pattern.`
      );
    }
    // 52g. The executable form of the refusal in research 57 section 2.1.
    if ((search.namesAProgram ?? []).length > 0) {
      fail(
        `repo-search names ${search.namesAProgram.join(', ')}. It may name ` +
          `none of ${P98_FORBIDDEN}: research 57 section 2 refused shipping a ` +
          `search engine to another person's computer, and this is the check ` +
          `that keeps the refusal executable rather than written down.`
      );
    }
  }
}


// ---------------------------------------------------------------------------
// 53. Phase 99. The name list that runs on the machine rather than on this Mac
// ---------------------------------------------------------------------------
//
// Copied from condition 52, which Phase 98 wrote for `repo-search`. Quick Open
// on a tab whose project lives on another machine needs the names of the files
// over there, and research 57 section 6 ruled that the enumeration happens where
// the files are for the same reasons the search does.
//
// Every check below reads the compiled script text and two compiled numbers. It
// sends nothing, starts nothing and contacts no machine.

const P99_FORBIDDEN = P98_FORBIDDEN;

{
  const p99 = data.phase99 ?? {};
  const files = p99.repoFiles ?? null;
  if (files === null) {
    fail(
      'the catalogue holds no script called repo-files, so the Quick Open ' +
        'palette on a tab that lives on another machine has nothing to ask.'
    );
  } else {
    // 53a. A read that is not in the catalogue cannot be sent at all.
    if (files.mode !== 'read' || files.params !== 2) {
      fail(
        `repo-files is a ${String(files.mode)} taking ` +
          `${String(files.params)} value(s). It is a read taking two, being ` +
          `the folder and the name cap plus one.`
      );
    }
    // 53b. The two verbs it may name, and no third one a later edit adds here.
    const verbs = [...(files.gitVerbs ?? [])].sort();
    if (JSON.stringify(verbs) !== JSON.stringify(['ls-files', 'rev-parse'])) {
      fail(
        `repo-files names git ${verbs.join(', ') || 'nothing'}. It names ` +
          `exactly rev-parse, to ask whether the folder is a repository, and ` +
          `ls-files, to ask which files are in it. Both are reads and neither ` +
          `reaches a server.`
      );
    }
    // 53c. The cap is in the text and not in a caller.
    if (files.branches !== 2) {
      fail(
        `repo-files builds its list on ${String(files.branches)} line(s). ` +
          `There are exactly two, being the repository branch and the walk ` +
          `branch, and every cap below is checked on both.`
      );
    }
    if (files.branchesCapped !== files.branches) {
      fail(
        `${String(files.branchesCapped)} of ${String(files.branches)} ` +
          `branch(es) of repo-files carry head -n "$2". A branch without it ` +
          `would send every name in a home directory in one answer.`
      );
    }
    // 53d. Two copies of one number is how one of them goes stale.
    const caps = files.byteCaps ?? [];
    if (caps.length !== files.branches) {
      fail(
        `repo-files carries ${String(caps.length)} head -c cap(s) and has ` +
          `${String(files.branches)} branch(es). Each branch ends at the size ` +
          `ceiling or it does not have one.`
      );
    }
    for (const cap of caps) {
      // ONE BYTE PAST THE CEILING, and that byte is the proof. A `head -c` that
      // stopped AT the ceiling cannot tell a stream of exactly that size from a
      // stream that was cut, and the answer would then be a guess.
      if (cap === files.declaredMaxBytes + 1) continue;
      fail(
        `repo-files reads ${String(cap)} bytes and REMOTE_FILE_LIST_MAX_BYTES ` +
          `reads ${String(files.declaredMaxBytes)}, so it should read ` +
          `${String(files.declaredMaxBytes + 1)}. The script text and the ` +
          `exported number are two copies of one ceiling, and this is the ` +
          `check that keeps them one value.`
      );
    }
    // 53e. The far side ANSWERS whether it cut, rather than leaving this end to
    // infer it from the last byte of the body.
    const tests = files.cutTests ?? [];
    if (tests.length !== 1 || tests[0] !== files.declaredMaxBytes) {
      fail(
        `repo-files compares the bytes it read against ` +
          `${tests.length === 0 ? 'nothing' : tests.join(', ')}. It compares ` +
          `them against ${String(files.declaredMaxBytes)} exactly once, and ` +
          `that comparison is the only thing that makes the cut an answer ` +
          `rather than a guess about the last byte of the body.`
      );
    }
    // 53f. Three words, being the mode, the cut answer and the body.
    if (files.answerWords !== 3) {
      fail(
        `repo-files prints ${String(files.answerWords)} word(s) between the ` +
          `markers. It prints three, being the mode, the cut answer and the ` +
          `body. Inferring the cut from the body ends a name list early and ` +
          `calls it complete.`
      );
    }
    // 53g. A repository's internals never cross the link, and a palette full of
    //      dependency files is a palette nobody can find their own file in.
    if (!files.prunesGit) {
      fail(
        'the walk branch of repo-files does not prune .git. A folder that is ' +
          'not a repository can still hold one below it, and no surface in ' +
          "this product asks for a repository's internals."
      );
    }
    if (!files.prunesNodeModules) {
      fail(
        'the walk branch of repo-files does not prune node_modules. A palette ' +
          'holding one dependency tree is a palette a person cannot find their ' +
          'own file in.'
      );
    }
    // 53h. The executable form of the refusal in research 57 section 2.1.
    if ((files.namesAProgram ?? []).length > 0) {
      fail(
        `repo-files names ${files.namesAProgram.join(', ')}. It may name ` +
          `none of ${P99_FORBIDDEN}: research 57 section 2 refused shipping a ` +
          `program to another person's computer, and this is the check that ` +
          `keeps the refusal executable rather than written down.`
      );
    }
  }
  // 53i. The write door did not move. Phase 99 added a READ.
  const writers = (data.remoteRun ?? {}).writers ?? [];
  if (JSON.stringify(writers) !== JSON.stringify(ALLOWED_WRITERS)) {
    fail(
      `the catalogue's write scripts are ${writers.join(', ') || 'none'}. They ` +
        `are exactly ${ALLOWED_WRITERS.join(', then ')}. Phase 99 added a read ` +
        `and nothing about what Tortie may write on another computer moved. ` +
        `Phase 101 added the third writer and this check reads the one ` +
        `allowlist rather than a copy of it.`
    );
  }
  // 53j. The git verb list. Phase 98 added `ls-files` and Phase 99 needed the
  //      same verb, so it added nothing. Phase 106 added `for-each-ref`, and it
  //      is the fifth and the only one added since. This is asserted on the
  //      list's own contents so a later round that widens it for convenience
  //      fails here rather than in review.
  const readVerbs = [...(p99.gitVerbsAcrossReads ?? [])].sort();
  const allowed = [...ALLOWED_GIT_VERBS].sort();
  for (const verb of readVerbs) {
    if (allowed.includes(verb)) continue;
    fail(
      `a read script names git ${verb}, which is not one of ` +
        `${allowed.join(', ')}. Phase 99 widened that list by nothing and no ` +
        `later phase may widen it here without saying so.`
    );
  }
  if (JSON.stringify(allowed) !== JSON.stringify(ALLOWED_GIT_VERBS_SORTED)) {
    fail(
      `ALLOWED_GIT_VERBS holds ${allowed.join(', ')}. It holds exactly ` +
        `${ALLOWED_GIT_VERBS_SORTED.join(', ')}. Phase 98 added ls-files, ` +
        `Phase 99 added nothing, Phase 106 added for-each-ref and Phase 107 ` +
        `added log, merge-base and rev-list, and a round that grows this list ` +
        `has widened what every script in the catalogue may run.`
    );
  }
}

// ---------------------------------------------------------------------------
// 54. Phase 100. The read that is not a scrollbar
// ---------------------------------------------------------------------------
//
// A person can now read the last lines one session on another machine printed.
// Research 57 section 3.1 ruled AGAINST a real remote scrollbar and FOR this
// smaller affordance, and the deciding reasons were the verb ledger and one
// door Phase 89 deliberately narrowed. A rule written in a document is a rule a
// later round can read past, so this condition makes it executable.
//
// THE CHECKABLE SENTENCE. The read composes `capture-pane -p -e -J -t <id> -S
// -<n>` and nothing else, `src/main/machines/remote-lines.ts` names neither of
// the two verbs a scrollbar would need, it takes exactly one name from the
// saved output side and never writes a capsule, and the ledger still holds
// `capture-pane` as a read row with repeat class safe.
//
// Every check below reads one composed argv, one module's own source text and
// four compiled numbers. It sends nothing, starts nothing and contacts no
// machine.

/** The argv this phase may send, element by element, at the deepest depth. */
const P100_ARGV_DEEP = [
  'capture-pane',
  '-p',
  '-e',
  '-J',
  '-t',
  '$9',
  '-S',
  '-25000'
];
/** The same at the screen alone, which is what `lines: 0` composes. */
const P100_ARGV_SCREEN = [
  'capture-pane',
  '-p',
  '-e',
  '-J',
  '-t',
  '$9',
  '-S',
  '-0'
];

{
  const p100 = data.phase100 ?? {};
  if (p100.present !== true) {
    fail(
      'src/main/machines/remote-lines.ts is not there, so a person has no way ' +
        'to read back what a session on another machine printed and Phase 95 ' +
        'sentence saying so has nothing to replace it.'
    );
  } else {
    // 54a. The argv, element by element, at both ends of the range the panel
    //      offers. A gained or lost element is a different command.
    const deep = [...(p100.argvDeep ?? [])];
    if (JSON.stringify(deep) !== JSON.stringify(P100_ARGV_DEEP)) {
      fail(
        `the deepest read composes ${JSON.stringify(deep)}. It composes ` +
          `${JSON.stringify(P100_ARGV_DEEP)} exactly. An element gained or ` +
          `lost here is a different command sent to somebody else's computer.`
      );
    }
    const screen = [...(p100.argvScreen ?? [])];
    if (JSON.stringify(screen) !== JSON.stringify(P100_ARGV_SCREEN)) {
      fail(
        `the screen alone composes ${JSON.stringify(screen)}. It composes ` +
          `${JSON.stringify(P100_ARGV_SCREEN)} exactly, being -S -0.`
      );
    }
    // 54b. The executable form of research 57 section 3.1's refusal.
    const named = p100.namesAScrollVerb ?? [];
    if (named.length > 0) {
      fail(
        `src/main/machines/remote-lines.ts names ${named.join(', ')}. It may ` +
          `name neither. Research 57 section 3.1 refused a real remote ` +
          `scrollbar twice over: one of those verbs is on no row of the ` +
          `ledger, and the other is the one unsafe row, reachable only through ` +
          `a door Phase 89 narrowed to a fixed five element argv. A builder ` +
          `who needs either one has designed the thing this phase refused.`
      );
    }
    // 54c. A read is not a capsule. One name crosses from the saved output
    //      side, being the control stripper, and no read writes a generation.
    const imports = p100.snapshotImports ?? [];
    if (JSON.stringify(imports) !== JSON.stringify(['stripControls'])) {
      fail(
        `src/main/machines/remote-lines.ts takes ` +
          `${imports.join(', ') || 'nothing'} from ../restore/snapshots. It ` +
          `takes exactly stripControls. A second copy of that regular ` +
          `expression is how two answers to "which bytes are text" come to ` +
          `exist, and anything else from that module would make a person ` +
          `pressing a menu item write to this Mac.`
      );
    }
    if (p100.callsCapsuleStore === true) {
      fail(
        'src/main/machines/remote-lines.ts calls storeCapsuleText. This read ' +
          'is a live read a person asked for, and it writes nothing on either ' +
          'computer. The background copy is ./remote-capsule.ts and it stays ' +
          'the only writer.'
      );
    }
    // 54d. One command per read, composed in one place.
    if (p100.execCalls !== 1 || p100.composerCalls !== 1) {
      fail(
        `src/main/machines/remote-lines.ts sends ` +
          `${String(p100.execCalls)} command(s) through ` +
          `${String(p100.composerCalls)} composer call(s). It sends one ` +
          `through one. A second call site is a second thing a person's ` +
          `session can be asked without anybody reading this file again.`
      );
    }
    // 54e. The four depths the panel offers, and the two ceilings.
    const depths = [...(p100.depths ?? [])];
    if (JSON.stringify(depths) !== JSON.stringify([0, 1000, 10000, 25000])) {
      fail(
        `the panel offers depths ${depths.join(', ') || 'none'}. It offers ` +
          `0, 1000, 10000 and 25000, shallowest first. Research 57 section ` +
          `3.2 measured the deepest one and nothing deeper has been measured.`
      );
    }
    if (p100.maxDepth !== 25_000 || p100.defaultDepth !== 1000) {
      fail(
        `the read clamps at ${String(p100.maxDepth)} lines and opens at ` +
          `${String(p100.defaultDepth)}. It clamps at 25000, which research ` +
          `57 section 3.2 measured at 4,200,243 bytes and about 0.51 s ` +
          `composed, and it opens at 1000.`
      );
    }
    if (p100.maxBytes !== 8_388_608) {
      fail(
        `the read cuts at ${String(p100.maxBytes)} bytes. It cuts at 8388608, ` +
          `which is about twice the measured worst case, so an ordinary read ` +
          `is never cut and a runaway one is bounded before the 64 MB exec ` +
          `plane buffer is reached.`
      );
    }
  }
  // 54f. The ledger row this read rides on has not moved. A row edited to
  //      `mutating`, or to an unsafe repeat class, would change what a person's
  //      machine is being asked without anything else in this phase changing.
  const capture = (data.ledger ?? []).find((row) => row.verb === 'capture-pane');
  if (capture === undefined) {
    fail(
      'capture-pane is not on the verb ledger, so the read this phase added ' +
        'has no row to ride on and the exec plane would refuse it.'
    );
  } else if (capture.kind !== 'read' || capture.repeat !== 'safe') {
    fail(
      `capture-pane reads ${String(capture.kind)} with repeat class ` +
        `${String(capture.repeat)}. It is a read and it is safe: with -p it ` +
        `prints what is on a screen and writes nothing, and two prints of one ` +
        `screen leave the machine exactly as one does. Phase 100 added no verb ` +
        `to this ledger and moved no row on it.`
    );
  }
}

// ---------------------------------------------------------------------------
// 55. Phase 105. The runs for a branch checked out on another machine, and the
// gh that never leaves this Mac
// ---------------------------------------------------------------------------
//
// A person can now read the workflow runs for a project that lives on another
// computer. The feature rests on ONE property and this condition is the
// executable form of it.
//
//   NO CREDENTIAL AND NO gh CROSSES. The gh program runs on this Mac and never
//   leaves it. No token, no gh invocation and no GitHub host name is sent to the
//   machine. Four short strings travel back, being a mode word, the origin
//   address, the branch name and the commit HEAD points at.
//
// A sentence in a header is a sentence a later round can read past, so 55d
// searches the script text for the nine words a credential would travel in, and
// 55e searches the exact bytes the door composes for a hostile folder value.
//
// Every check below reads one compiled script text, one composed command, one
// module's own source text and one composed gh argv. It starts nothing, opens no
// file under the person's home, contacts no machine and MAKES NO REQUEST: the gh
// argv is composed and handed to the allowlist, never to a process.

/** The nine words a credential would have to travel in, for the message. */
const P105_CREDENTIAL_WORDS =
  'gh, GH_TOKEN, GITHUB_TOKEN, GH_HOST, Authorization, hosts.yml, .config/gh, ' +
  'netrc or curl';

{
  const p105 = data.phase105 ?? {};
  const script = p105.script ?? null;
  // 55a. A read that is not in the catalogue cannot be sent at all.
  if (script === null) {
    fail(
      'the catalogue holds no script called repo-facts, so the Runs section on ' +
        'a tab whose project lives on another machine has nothing to ask.'
    );
  } else {
    if (script.mode !== 'read' || script.params !== 1) {
      fail(
        `repo-facts is a ${String(script.mode)} taking ` +
          `${String(script.params)} value(s). It is a read taking one, being ` +
          `the folder on that machine.`
      );
    }
    // 55b. One git verb, and it is the one that was already allowed.
    const verbs = [...(p105.gitVerbs ?? [])].sort();
    if (JSON.stringify(verbs) !== JSON.stringify(['rev-parse'])) {
      fail(
        `repo-facts names git ${verbs.join(', ') || 'nothing'}. It names ` +
          `exactly rev-parse, three times: where the git directory is, what ` +
          `HEAD names, and which commit HEAD points at. symbolic-ref is not ` +
          `needed because rev-parse answers the same question, and remote is ` +
          `not needed because awk over the config answers it.`
      );
    }
    // 55d. The executable form of "no credential and no gh crosses".
    const inScript = p105.credentialWordsInScript ?? [];
    if (inScript.length > 0) {
      fail(
        `repo-facts names ${inScript.join(', ')}. It may name none of ` +
          `${P105_CREDENTIAL_WORDS}. The gh program runs on this Mac and never ` +
          `leaves it, and this is the check that keeps that sentence ` +
          `executable rather than written down.`
      );
    }
    // 55e. The bytes that actually cross, rather than the script alone.
    const inCommand = p105.credentialWordsInCommand ?? [];
    if (inCommand.length > 0) {
      fail(
        `the command this door composes names ${inCommand.join(', ')}. It may ` +
          `name none of ${P105_CREDENTIAL_WORDS}.`
      );
    }
    if (p105.hostileInScript === true) {
      fail(
        'a caller value reached the repo-facts text itself. Values cross as ' +
          'positional parameters and nothing is ever composed into a script.'
      );
    }
    if (p105.hostileInCommand !== 1 || p105.hostileQuoted !== true) {
      fail(
        `a hostile folder value appears ${String(p105.hostileInCommand)} ` +
          `time(s) in the composed command and quoted is ` +
          `${String(p105.hostileQuoted)}. It appears exactly once, in the ` +
          `quoted tail, and never inside the script.`
      );
    }
    // 55f. Research 57 section 9 defect 5, made executable.
    if (p105.namesCommonDir !== true || p105.namesAbsoluteDir === true) {
      fail(
        `repo-facts asks for the git directory with ` +
          `${p105.namesAbsoluteDir === true ? 'the worktree spelling' : 'neither spelling'}. ` +
          `It asks with --git-common-dir and never --absolute-git-dir. ` +
          `MEASURED in a linked worktree: the first answered the shared .git, ` +
          `whose config holds the origin, and the second answered the ` +
          `worktree's own directory, which holds no origin. A Runs section ` +
          `built on the second reports "no GitHub address" for a worktree that ` +
          `has one.`
      );
    }
  }
  // 55c. The git verb list. Phase 98 added `ls-files`, Phases 99, 100 and 105
  //      added nothing, and Phase 106 added `for-each-ref`. Asserted on the
  //      list's own contents so a later round that widens it for convenience
  //      fails here.
  const p105Allowed = [...ALLOWED_GIT_VERBS].sort();
  if (
    JSON.stringify(p105Allowed) !== JSON.stringify(ALLOWED_GIT_VERBS_SORTED)
  ) {
    fail(
      `ALLOWED_GIT_VERBS holds ${p105Allowed.join(', ')}. It holds exactly ` +
        `${ALLOWED_GIT_VERBS_SORTED.join(', ')}. Phase 98 added ls-files, ` +
        `Phases 99, 100 and 105 added nothing, Phase 106 added for-each-ref ` +
        `and Phase 107 added log, merge-base and rev-list.`
    );
  }
  // 55g. What the module does, counted in its own text.
  if (p105.present !== true) {
    fail(
      'src/main/machines/remote-runs.ts is not there, so the Runs section on a ' +
        'tab whose project lives on another machine has nothing behind it.'
    );
  } else {
    if (p105.callsRemoteWrite === true) {
      fail(
        'src/main/machines/remote-runs.ts calls runRemoteWrite. This whole ' +
          'feature is a read, and nothing in it writes on either computer.'
      );
    }
    if (p105.remoteReads !== 1) {
      fail(
        `src/main/machines/remote-runs.ts makes ${String(p105.remoteReads)} ` +
          `remote read(s). It makes one. A second call site is a second thing ` +
          `a person's machine can be asked without anybody reading this file ` +
          `again.`
      );
    }
    const ids = [...(p105.scriptIdsNamed ?? [])].sort();
    if (JSON.stringify(ids) !== JSON.stringify(['repo-facts'])) {
      fail(
        `src/main/machines/remote-runs.ts names the catalogue script(s) ` +
          `${ids.join(', ') || 'none'}. It names exactly repo-facts.`
      );
    }
  }
  // 55h. The write door did not move, and the catalogue grew by exactly one.
  const p105Writers = (data.remoteRun ?? {}).writers ?? [];
  if (JSON.stringify(p105Writers) !== JSON.stringify(ALLOWED_WRITERS)) {
    fail(
      `the catalogue's write scripts are ${p105Writers.join(', ') || 'none'}. ` +
        `They are exactly ${ALLOWED_WRITERS.join(', then ')}. Phase 105 added ` +
        `a read and nothing about what Tortie may write on another computer ` +
        `moved. Phase 101 added the third writer and this check reads the one ` +
        `allowlist rather than a copy of it.`
    );
  }
  const p105Count = ((data.remoteRun ?? {}).scripts ?? []).length;
  // Phase 109 moved this count from eighteen to nineteen by one read, Phase
  // 101 moved it from nineteen to twenty by one write, and Phase 102 moved it
  // from twenty to twenty two by two writes.
  if (p105Count !== REMOTE_SCRIPT_COUNT) {
    fail(
      `the catalogue holds ${String(p105Count)} script(s). It holds twenty ` +
        `two, of which five write. Phase 106 moved that number from fifteen by ` +
        `one read, Phase 107 moved it from sixteen, Phase 108 moved it from ` +
        `seventeen and Phase 109 moved it from eighteen, each by one read, ` +
        `Phase 101 moved it from nineteen by one WRITE and Phase 102 moved it ` +
        `from twenty by two WRITES. A ` +
        `script that appeared without a phase ` +
        `saying so is a command somebody can run on another person's computer.`
    );
  }
  // 55i. The one gh command line, and the allowlist's own verdict on it.
  if (p105.ghRefusal !== null && p105.ghRefusal !== undefined) {
    fail(
      `the gh command line this feature composes is refused by ` +
        `assertReadOnlyArgv: ${String(p105.ghRefusal)}. Every gh shape this ` +
        `product may compose is a read, and one that is refused would never ` +
        `run at all.`
    );
  }
  const ghArgv = [...(p105.ghArgv ?? [])];
  if (ghArgv[0] !== 'run' || ghArgv[1] !== 'list' || !ghArgv.includes('--repo')) {
    fail(
      `the gh command line this feature composes is ` +
        `${ghArgv.slice(0, 2).join(' ') || 'nothing'} and ` +
        `${ghArgv.includes('--repo') ? 'names' : 'does not name'} its ` +
        `repository. It is a run list and it always names --repo, so no folder ` +
        `on either computer can change the answer.`
    );
  }
}

// ---------------------------------------------------------------------------
// 56. Phase 106. The branch checked out on another machine, and the fetch that
// never happens
// ---------------------------------------------------------------------------
//
// A person can now read which branch is checked out in a folder that lives on
// another computer, the branch it follows, and how far ahead and how far behind
// it is. Two properties carry this feature and both are checked here rather
// than promised.
//
//   TORTIE NEVER FETCHES ON THAT MACHINE. The two counts are measured against
//   the copy of the upstream that machine last fetched, so the answer can be
//   older than what is on the server when it is read. The panel says so in its
//   own words, and 56i is what keeps that sentence checkable.
//
//   ONE FORMAT, IN ONE PLACE. The far side asks `for-each-ref` with a format,
//   and `parseForEachRefBranches` in src/main/git/parse.ts reads what comes
//   back. Two copies of one format is how one of them goes stale, and a stale
//   one means this end reads the wrong field as a branch name. 56d asserts that
//   the script's format plus `%(subject)` is exactly `BRANCH_FORMAT`.
//
// Every check below reads one compiled script text, one composed command, one
// compiled constant and one module's own source text. It starts nothing, opens
// no file under the person's home, contacts no machine and makes no request.

{
  const p106 = data.phase106 ?? {};
  const script = p106.script ?? null;
  // 56a. A read that is not in the catalogue cannot be sent at all.
  if (script === null) {
    fail(
      'the catalogue holds no script called repo-branch, so the Branch group ' +
        'on a tab whose project lives on another machine has nothing to ask.'
    );
  } else {
    if (script.mode !== 'read' || script.params !== 1) {
      fail(
        `repo-branch is a ${String(script.mode)} taking ` +
          `${String(script.params)} value(s). It is a read taking one, being ` +
          `the folder on that machine.`
      );
    }
    // 56b. Two git verbs, and no third.
    const verbs = [...(p106.gitVerbs ?? [])].sort();
    if (JSON.stringify(verbs) !== JSON.stringify(['for-each-ref', 'rev-parse'])) {
      fail(
        `repo-branch names git ${verbs.join(', ') || 'nothing'}. It names ` +
          `exactly rev-parse, twice, and for-each-ref, once. rev-parse answers ` +
          `where the git directory is and what HEAD names, and for-each-ref ` +
          `answers everything about the branch in one line.`
      );
    }
    // 56d. ONE FORMAT, IN ONE PLACE.
    if (p106.formatPlusSubject !== p106.branchFormat) {
      fail(
        `the format repo-branch asks with is ${String(p106.format)}. That ` +
          `plus %(subject) is not BRANCH_FORMAT, which is ` +
          `${String(p106.branchFormat)}. The far side prints what this format ` +
          `says and parseForEachRefBranches reads it, so two copies that ` +
          `disagree means this end reads the wrong field as a branch name. The ` +
          `subject is dropped because it is the one field with no length bound ` +
          `and this read carries no cut.`
      );
    }
    // 56e. Research 57 section 9 defect 5, made executable a second time.
    if (p106.namesCommonDir !== true || p106.namesAbsoluteDir === true) {
      fail(
        `repo-branch asks for the git directory with ` +
          `${p106.namesAbsoluteDir === true ? 'the worktree spelling' : 'neither spelling'}. ` +
          `It asks with --git-common-dir and never --absolute-git-dir. A ` +
          `linked worktree must answer as a repository, and the second ` +
          `spelling answers with the worktree's own directory.`
      );
    }
    // 56f. A caller value never reaches the text, and crosses once and quoted.
    if (p106.hostileInScript === true) {
      fail(
        'a caller value reached the repo-branch text itself. Values cross as ' +
          'positional parameters and nothing is ever composed into a script.'
      );
    }
    if (p106.hostileInCommand !== 1 || p106.hostileQuoted !== true) {
      fail(
        `a hostile folder value appears ${String(p106.hostileInCommand)} ` +
          `time(s) in the composed command and quoted is ` +
          `${String(p106.hostileQuoted)}. It appears exactly once, in the ` +
          `quoted tail, and never inside the script.`
      );
    }
    // 56i. THE EXECUTABLE FORM OF A SENTENCE ON SCREEN.
    const fetchers = p106.fetchVerbsInScript ?? [];
    if (fetchers.length > 0) {
      fail(
        `repo-branch names ${fetchers.join(', ')}. It may name none of them. ` +
          `The panel tells a person that Tortie counted against the copy of ` +
          `the upstream that machine holds and that Tortie does not fetch ` +
          `there, and this is the check that keeps that sentence executable ` +
          `rather than written down. A fetch would also be a write on somebody ` +
          `else's computer made by a read.`
      );
    }
  }
  // 56c. The git verb list, held at the five this phase leaves it at.
  const p106Allowed = [...ALLOWED_GIT_VERBS].sort();
  if (
    JSON.stringify(p106Allowed) !== JSON.stringify(ALLOWED_GIT_VERBS_SORTED)
  ) {
    fail(
      `ALLOWED_GIT_VERBS holds ${p106Allowed.join(', ')}. It holds exactly ` +
        `${ALLOWED_GIT_VERBS_SORTED.join(', ')}. Phase 106 added for-each-ref ` +
        `because it reads the ref store and reaches no server, which is the ` +
        `same test the other four meet, and Phase 107 added log, merge-base ` +
        `and rev-list on the same test.`
    );
  }
  // 56g. What the module does, counted in its own text.
  if (p106.present !== true) {
    fail(
      'src/main/machines/remote-branch.ts is not there, so the Branch group on ' +
        'a tab whose project lives on another machine has nothing behind it.'
    );
  } else {
    if (p106.callsRemoteWrite === true) {
      fail(
        'src/main/machines/remote-branch.ts calls runRemoteWrite. This whole ' +
          'feature is a read, and nothing in it writes on either computer. ' +
          'Switching a branch on a machine is a write and no phase has built ' +
          'one.'
      );
    }
    if (p106.remoteReads !== 1) {
      fail(
        `src/main/machines/remote-branch.ts makes ${String(p106.remoteReads)} ` +
          `remote read(s). It makes one. A second call site is a second thing ` +
          `a person's machine can be asked without anybody reading this file ` +
          `again.`
      );
    }
    const ids = [...(p106.scriptIdsNamed ?? [])].sort();
    if (JSON.stringify(ids) !== JSON.stringify(['repo-branch'])) {
      fail(
        `src/main/machines/remote-branch.ts names the catalogue script(s) ` +
          `${ids.join(', ') || 'none'}. It names exactly repo-branch.`
      );
    }
    // 56j. The stale sentence Phase 105 had to leave standing is not made
    //      worse. The header of src/main/actions/index.ts says that directory's
    //      argv allowlist, gh spawn and parser are imported only by its own
    //      tests, and Phase 105 made that false for one production module. This
    //      phase adds no second one.
    const fromActions = [...(p106.actionsImports ?? [])].sort();
    if (fromActions.length > 0) {
      fail(
        `src/main/machines/remote-branch.ts imports ${fromActions.join(', ')} ` +
          `from ../actions/. It imports nothing from there. That directory's ` +
          `own header says its argv allowlist, its gh spawn and its parser are ` +
          `imported directly only by its tests, Phase 105 already made that ` +
          `sentence stale for one module, and a second one would make it worse ` +
          `rather than fix it.`
      );
    }
  }
  // 56h. The write door did not move, and the catalogue grew by exactly one.
  const p106Writers = (data.remoteRun ?? {}).writers ?? [];
  if (JSON.stringify(p106Writers) !== JSON.stringify(ALLOWED_WRITERS)) {
    fail(
      `the catalogue's write scripts are ${p106Writers.join(', ') || 'none'}. ` +
        `They are exactly ${ALLOWED_WRITERS.join(', then ')}. Phase 106 added ` +
        `a read and nothing about what Tortie may write on another computer ` +
        `moved. Phase 101 added the third writer and this check reads the one ` +
        `allowlist rather than a copy of it.`
    );
  }
  const p106Count = ((data.remoteRun ?? {}).scripts ?? []).length;
  // Phase 109 moved this count from eighteen to nineteen by one read, Phase
  // 101 moved it from nineteen to twenty by one write, and Phase 102 moved it
  // from twenty to twenty two by two writes.
  if (p106Count !== REMOTE_SCRIPT_COUNT) {
    fail(
      `the catalogue holds ${String(p106Count)} script(s). It holds twenty ` +
        `two, of which five write.`
    );
  }
}

// ---------------------------------------------------------------------------
// 57. Phase 107. The commit graph of a folder on another machine, the ceiling
// that keeps one answer small, and the guard that stayed home
// ---------------------------------------------------------------------------
//
// A person can now read the newest commits in a folder that lives on another
// computer, with the same swimlane picture the local History draws. Three
// properties carry this feature and all three are checked here rather than
// promised.
//
//   A PERSON CANNOT ASK FOR 20,000 COMMITS. One commit is about 270 base64
//   bytes, so 500 is about 135,000 and 20,000 would be 5,400,000 in one answer
//   that main buffers whole, hands to a parser whole and sends over one IPC
//   message whole. The backlog entry says the tier rises to 3 if paging lets a
//   person ask for that. Condition 57j is what holds the two constants, and it
//   is therefore the executable form of the tier staying at 2.
//
//   THE THREE CUTS ARE DRAWN. Phase 99 carried a truncation flag through main
//   that the panel never read, so a cut list drew as a whole one. This answer
//   carries three flags saying what was cut, being `hasMore`, `atCeiling` and
//   `divergenceTruncated`, and condition 57m fails the build when the panel
//   does not name all three.
//
//   NO REF NAME IS A VALUE. Research 57 section 5.5 proposed reading the ref
//   names on the far side with `for-each-ref`, piping them into
//   `git log --stdin`, and moving the guard `sanitizeRefNames` over there. The
//   shipped walk is `--branches --tags --remotes`, which enumerates nothing and
//   pipes nothing, so the guard's job is removed rather than relocated.
//   Condition 57h is the executable form of that, and it also refuses `--stdin`
//   for a measured reason. `printf '' | git log --stdin` walks HEAD SILENTLY,
//   so an empty ref list on the far side would answer a HEAD only walk while
//   this end believed it had asked for everything.
//
// Every check below reads one compiled script text, one composed command, two
// compiled constants and three source files. It starts nothing, opens no file
// under the person's home, contacts no machine and makes no request.

{
  const p107 = data.phase107 ?? {};
  const script = p107.script ?? null;
  // 57a. A read that is not in the catalogue cannot be sent at all.
  if (script === null) {
    fail(
      'the catalogue holds no script called repo-history, so the History group ' +
        'on a tab whose project lives on another machine has nothing to ask.'
    );
  } else {
    if (script.mode !== 'read' || script.params !== 2) {
      fail(
        `repo-history is a ${String(script.mode)} taking ` +
          `${String(script.params)} value(s). It is a read taking two, being ` +
          `the folder on that machine and how many commits to walk.`
      );
    }
    // 57b. Four git verbs, and no fifth.
    const verbs = [...(p107.gitVerbs ?? [])].sort();
    if (
      JSON.stringify(verbs) !==
      JSON.stringify(['log', 'merge-base', 'rev-list', 'rev-parse'])
    ) {
      fail(
        `repo-history names git ${verbs.join(', ') || 'nothing'}. It names ` +
          `exactly log, merge-base, rev-list and rev-parse. rev-parse answers ` +
          `where the git directory is and what two refs point at, log walks ` +
          `the commits, merge-base finds where the branch and its upstream ` +
          `parted, and rev-list names the commits on each side of that.`
      );
    }
    // 57d. ONE FORMAT, IN ONE PLACE.
    if (p107.format !== p107.graphLogFormat) {
      fail(
        `the format repo-history asks with is ${String(p107.format)} and ` +
          `GRAPH_LOG_FORMAT is ${String(p107.graphLogFormat)}. They are one ` +
          `format. The far side prints what this format says and parseGraphLog ` +
          `reads it, so two copies that disagree means this end reads the wrong ` +
          `field as a commit subject. remote-scripts.ts imports nothing, not ` +
          `even a type, so the format is written out there as a literal and ` +
          `this is the check that holds the two together.`
      );
    }
    // 57e. Research 57 section 9 defect 5, made executable a third time.
    if (p107.namesCommonDir !== true || p107.namesAbsoluteDir === true) {
      fail(
        `repo-history asks for the git directory with ` +
          `${p107.namesAbsoluteDir === true ? 'the worktree spelling' : 'neither spelling'}. ` +
          `It asks with --git-common-dir and never --absolute-git-dir. A ` +
          `linked worktree must answer as a repository, and row 9 of ` +
          `node build/probe-p107-history.mjs is the row that fails when the ` +
          `wrong spelling is used.`
      );
    }
    // 57f. A caller value never reaches the text, and crosses once and quoted.
    if (p107.hostileInScript === true) {
      fail(
        'a caller value reached the repo-history text itself. Values cross as ' +
          'positional parameters and nothing is ever composed into a script.'
      );
    }
    if (p107.hostileInCommand !== 1 || p107.hostileQuoted !== true) {
      fail(
        `a hostile folder value appears ${String(p107.hostileInCommand)} ` +
          `time(s) in the composed command and quoted is ` +
          `${String(p107.hostileQuoted)}. It appears exactly once, in the ` +
          `quoted tail, and never inside the script.`
      );
    }
    // 57g. IT NEVER FETCHES.
    const fetchers = p107.fetchVerbsInScript ?? [];
    if (fetchers.length > 0) {
      fail(
        `repo-history names ${fetchers.join(', ')}. It may name none of them. ` +
          `The marks that say which commits are ahead of the followed branch ` +
          `and which are behind it are measured against the copy of the ` +
          `upstream that machine last fetched, and a fetch would also be a ` +
          `write on somebody else's computer made by a read.`
      );
    }
    // 57h. THE EXECUTABLE FORM OF "NO REF NAME IS A VALUE".
    const missingWalk = [
      p107.walksBranches === true ? null : '--branches',
      p107.walksTags === true ? null : '--tags',
      p107.walksRemotes === true ? null : '--remotes'
    ].filter((one) => one !== null);
    if (missingWalk.length > 0) {
      fail(
        `repo-history does not name ${missingWalk.join(', ')}. The walk names ` +
          `its three ref classes itself, which is what keeps every ref name off ` +
          `the wire and lets the guard sanitizeRefNames stay on this side of ` +
          `the link instead of being written again in sh.`
      );
    }
    const refused = p107.refusedWalkFlags ?? [];
    if (refused.length > 0) {
      fail(
        `repo-history names ${refused.join(', ')}. It may name none of them. ` +
          `--stdin is refused because git log --stdin WALKS HEAD SILENTLY when ` +
          `its input is empty, measured on 2026-08-20 against git 2.50.1, so a ` +
          `repository with no refs would answer a HEAD only walk while this end ` +
          `believed it had asked for everything. --all, refs/stash and ` +
          `refs/notes are refused for research 24's reason, being that they are ` +
          `not history a person reasons about.`
      );
    }
  }
  // 57c. The git verb list, held at the eight this phase leaves it at.
  const p107Allowed = [...ALLOWED_GIT_VERBS].sort();
  if (
    JSON.stringify(p107Allowed) !== JSON.stringify(ALLOWED_GIT_VERBS_SORTED)
  ) {
    fail(
      `ALLOWED_GIT_VERBS holds ${p107Allowed.join(', ')}. It holds exactly ` +
        `${ALLOWED_GIT_VERBS_SORTED.join(', ')}. Phase 107 added log, ` +
        `merge-base and rev-list because each of them walks or reads the ` +
        `object database and reaches no server, which is the same test the ` +
        `first five meet and the reason all eight take the exemption from the ` +
        `two prompt names.`
    );
  }
  // 57i. What the module does, counted in its own text.
  if (p107.present !== true) {
    fail(
      'src/main/machines/remote-history.ts is not there, so the History group ' +
        'on a tab whose project lives on another machine has nothing behind it.'
    );
  } else {
    if (p107.callsRemoteWrite === true) {
      fail(
        'src/main/machines/remote-history.ts calls runRemoteWrite. This whole ' +
          'feature is a read, and nothing in it writes on either computer. The ' +
          'local History group offers checkout, create branch and cherry pick, ' +
          'and every one of those is a write no phase has built for a machine.'
      );
    }
    if (p107.remoteReads !== 1) {
      fail(
        `src/main/machines/remote-history.ts makes ` +
          `${String(p107.remoteReads)} remote read(s). It makes one. A second ` +
          `call site is a second thing a person's machine can be asked without ` +
          `anybody reading this file again.`
      );
    }
    const ids = [...(p107.scriptIdsNamed ?? [])].sort();
    if (JSON.stringify(ids) !== JSON.stringify(['repo-history'])) {
      fail(
        `src/main/machines/remote-history.ts names the catalogue script(s) ` +
          `${ids.join(', ') || 'none'}. It names exactly repo-history.`
      );
    }
    const fromActions = [...(p107.actionsImports ?? [])].sort();
    if (fromActions.length > 0) {
      fail(
        `src/main/machines/remote-history.ts imports ${fromActions.join(', ')} ` +
          `from ../actions/. It imports nothing from there. That directory's ` +
          `own header says its argv allowlist, its gh spawn and its parser are ` +
          `imported directly only by its tests, Phase 105 already made that ` +
          `sentence stale for one module, and a second one would make it worse ` +
          `rather than fix it.`
      );
    }
    const guardLines = p107.sanitizeRefNamesLines ?? [];
    if (guardLines.length > 0) {
      fail(
        `src/main/machines/remote-history.ts names sanitizeRefNames on code ` +
          `line(s) ${guardLines.join(', ')}. It names it in prose and nowhere ` +
          `else. The walk is --branches --tags --remotes, so no ref name is a ` +
          `value at any point and there is nothing for that guard to sanitise. ` +
          `A call here would mean a ref name had become a value again.`
      );
    }
  }
  // 57j. THE EXECUTABLE FORM OF THE TIER STAYING AT 2.
  if (p107.page !== 50 || p107.ceiling !== 500) {
    fail(
      `REMOTE_HISTORY_PAGE is ${String(p107.page)} and ` +
        `REMOTE_HISTORY_MAX_COMMITS is ${String(p107.ceiling)}. They are 50 ` +
        `and 500. One commit is about 270 base64 bytes, so 500 is about ` +
        `135,000 bytes in one answer and 20,000 would be 5,400,000. The Phase ` +
        `107 entry says the tier rises to 3 if paging lets a person ask for ` +
        `20,000 commits, and this pair is what stops them asking.`
    );
  }
  // 57k. The write door did not move, and the catalogue grew by exactly one.
  const p107Writers = (data.remoteRun ?? {}).writers ?? [];
  if (JSON.stringify(p107Writers) !== JSON.stringify(ALLOWED_WRITERS)) {
    fail(
      `the catalogue's write scripts are ${p107Writers.join(', ') || 'none'}. ` +
        `They are exactly ${ALLOWED_WRITERS.join(', then ')}. Phase 107 added ` +
        `a read and nothing about what Tortie may write on another computer ` +
        `moved. Phase 101 added the third writer and this check reads the one ` +
        `allowlist rather than a copy of it.`
    );
  }
  const p107Count = ((data.remoteRun ?? {}).scripts ?? []).length;
  // Phase 109 moved this count from eighteen to nineteen by one read, Phase
  // 101 moved it from nineteen to twenty by one write, and Phase 102 moved it
  // from twenty to twenty two by two writes.
  if (p107Count !== REMOTE_SCRIPT_COUNT) {
    fail(
      `the catalogue holds ${String(p107Count)} script(s). It holds twenty ` +
        `two, of which five write.`
    );
  }
  // 57l. NO TIMER, ANYWHERE. Main cannot see a commit made on another computer,
  //      so a timer here would read a machine nobody asked it to read.
  if (p107.storePresent !== true) {
    fail(
      'src/renderer/scm/remote-history.ts is not there, so the History group ' +
        'on a remote tab has no store behind it.'
    );
  } else if ((p107.storeTimers ?? []).length > 0) {
    fail(
      `src/renderer/scm/remote-history.ts names ` +
        `${p107.storeTimers.join(', ')}. It names none of them. A read happens ` +
        `on the first expand, on Load more and on Refresh, and at no other ` +
        `time. Main cannot see a commit made on another computer, so there is ` +
        `nothing for a timer to notice and everything for it to cost.`
    );
  }
  // 57m. THE EXECUTABLE FORM OF THE PHASE 99 HONESTY GAP NOT REPEATING.
  if (p107.panelPresent !== true) {
    fail(
      'src/renderer/scm/RemoteHistorySection.tsx is not there, so nothing ' +
        'draws the commits this feature reads.'
    );
  } else {
    const drawn = p107.panelHonestyFields ?? [];
    const wanted = ['hasMore', 'atCeiling', 'divergenceTruncated'];
    const absent = wanted.filter((one) => !drawn.includes(one));
    if (absent.length > 0) {
      fail(
        `src/renderer/scm/RemoteHistorySection.tsx does not name ` +
          `${absent.join(', ')}. It names all three. Each one says something ` +
          `was cut: hasMore says older commits exist, atCeiling says Tortie ` +
          `will not read further, and divergenceTruncated says an older commit ` +
          `is drawn without a mark whether it has one or not. Phase 99 carried ` +
          `a truncation flag through main that the panel never read, and a cut ` +
          `list drew as a whole one.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 58. Phase 108. The Context of a folder on another machine, the one
// precedence table, and the caps that keep one call small
// ---------------------------------------------------------------------------
//
// A person can now read, on a tab whose project lives on another machine, the
// skills, MCP servers, hooks, plugins and instruction files the agents THERE
// will load. Three properties carry this feature and all three are checked
// here rather than promised.
//
//   THERE IS NO SECOND TABLE. The reader that resolves the per agent
//   precedence runs UNCHANGED on this Mac, and the far side only lists
//   directories and sends file bytes back. `npm run conformance:context`
//   proves the matrix itself; condition 58d proves the remote path cannot hold
//   a copy, because the driver imports `scanContext` and nothing from
//   `agent-context`, and the recording filesystem imports nothing from the
//   machines domain.
//
//   REMOTE CONTEXT IS A READ AND NOTHING ELSE. Install, enable and pin are
//   refused permanently, the catalogue's write list does not move, and
//   `context-read` names no git verb at all because context is not a git
//   question.
//
//   THE HONEST SENTENCES ARE REAL. A remote list says it came from the
//   machine, a remote list says nested project skills are not in it, and a cut
//   list says it was cut. Phase 99 carried a truncation flag through main that
//   the panel never read, and condition 58h is what stops that repeating.
//
// Every check below reads one compiled script text, compiled constants and
// four source files. It starts nothing, opens no file under the person's home,
// contacts no machine and makes no request.

{
  const p108 = data.phase108 ?? {};
  const script = p108.script ?? null;
  // 58a. The catalogue holds twenty two scripts and the write list moved twice
  //      since Phase 108, in Phase 101 and again in Phase 102.
  const p108Writers = (data.remoteRun ?? {}).writers ?? [];
  if (JSON.stringify(p108Writers) !== JSON.stringify(ALLOWED_WRITERS)) {
    fail(
      `the catalogue's write scripts are ${p108Writers.join(', ') || 'none'}. ` +
        `They are exactly ${ALLOWED_WRITERS.join(', then ')}. Phase 108 added ` +
        `a read and nothing about what Tortie may write on another computer ` +
        `moved. Phase 101 added the third writer and this check reads the one ` +
        `allowlist rather than a copy of it.`
    );
  }
  const p108Count = ((data.remoteRun ?? {}).scripts ?? []).length;
  if (p108Count !== REMOTE_SCRIPT_COUNT) {
    fail(
      `the catalogue holds ${String(p108Count)} script(s). It holds twenty ` +
        `two, of which five write. Phase 109 moved that number from eighteen by ` +
        `one read, being agents-find, Phase 101 moved it from nineteen by one ` +
        `write, being file-put, and Phase 102 moved it from twenty by two ` +
        `writes, being dir-new and entry-rename.`
    );
  }
  // 58b. The row's own shape. Rules 1 to 5 are asserted for every script by
  // the generic conditions 35 to 40; this pins what is particular to this row.
  if (script === null) {
    fail(
      'the catalogue holds no script called context-read, so the Context view ' +
        'on a tab whose project lives on another machine has nothing to ask.'
    );
  } else {
    if (script.mode !== 'read' || script.params !== 3) {
      fail(
        `context-read is a ${String(script.mode)} taking ` +
          `${String(script.params)} value(s). It is a read taking three, being ` +
          `the list of directories to enumerate, the depth, and the list of ` +
          `files to read back.`
      );
    }
    if (p108.readsListsIntoLocals !== true || p108.splitsUnderIfs !== true) {
      fail(
        `context-read reads its lists ` +
          `${p108.readsListsIntoLocals === true ? 'into local names' : 'WITHOUT local names'} ` +
          `and ${p108.splitsUnderIfs === true ? 'splits under IFS' : 'DOES NOT split under IFS'}. ` +
          `Each list is read once, in quotes, into a local name, and the word ` +
          `splitting happens on that local name under IFS set to a newline. ` +
          `That is the program-find shape, being condition 46's precedent, ` +
          `because a bare positional in a for loop would end rule 2 of the ` +
          `catalogue.`
      );
    }
    // 58c. Context is not a git question.
    const verbs = [...(p108.gitVerbs ?? [])].sort();
    if (verbs.length > 0) {
      fail(
        `context-read names git ${verbs.join(', ')}. It names NO git verb at ` +
          `all. Context is not a git question, and a git verb appearing here ` +
          `would be a widening no phase asked for.`
      );
    }
  }
  // 58d. NO SECOND TABLE, in its executable form (research 57 i7 section 6.3).
  if (p108.driverPresent !== true) {
    fail(
      'src/main/machines/remote-agent-context.ts is not there, so the Context ' +
        'view on a tab whose project lives on another machine has nothing ' +
        'behind it.'
    );
  } else {
    if (p108.driverImportsScan !== true) {
      fail(
        'src/main/machines/remote-agent-context.ts does not import ' +
          'scanContext from ../context/scan. The remote path reuses the one ' +
          'reader whole; anything else is a second reader whose answers the ' +
          'matrix gate never sees.'
      );
    }
    const driverImports = p108.driverImports ?? [];
    const forbidden = driverImports.filter(
      (one) => one.includes('agent-context') || one === 'node:fs'
    );
    if (forbidden.length > 0) {
      fail(
        `src/main/machines/remote-agent-context.ts imports ` +
          `${forbidden.join(', ')}. It imports neither agent-context nor ` +
          `node:fs: the precedence table stays in the one file ` +
          `conformance:context reads, and the driver reads no disk of its own.`
      );
    }
    if (p108.driverNamesAtTable === true) {
      fail(
        'src/main/machines/remote-agent-context.ts declares location rows of ' +
          'its own. The declared locations live in agent-context.ts and ' +
          'nowhere else, so a remote tab cannot draw a ladder the local panel ' +
          'would not draw.'
      );
    }
  }
  if (p108.recordingPresent !== true) {
    fail(
      'src/main/context/recording-fs.ts is not there, so the remote read has ' +
        'no filesystem to run the reader over.'
    );
  } else {
    const machineImports = (p108.recordingImports ?? []).filter((one) =>
      one.includes('machines')
    );
    if (machineImports.length > 0) {
      fail(
        `src/main/context/recording-fs.ts imports ${machineImports.join(', ')} ` +
          `from the machines domain. It is pure and it faces the reader only, ` +
          `so the context domain cannot grow a dependency on a connection.`
      );
    }
  }
  // 58e. NO TIMER, ANYWHERE. Main cannot see a file change on another
  // computer, so a timer would read a machine nobody asked it to read.
  if ((p108.driverTimers ?? []).length > 0) {
    fail(
      `src/main/machines/remote-agent-context.ts names ` +
        `${p108.driverTimers.join(', ')}. It names none of them. A read ` +
        `happens when the view opens, when the project changes and on ` +
        `Refresh, and at no other time.`
    );
  }
  if (p108.storePresent !== true) {
    fail(
      'src/renderer/context/store.ts is not there, so nothing drives the ' +
        'Context view at all.'
    );
  } else if ((p108.storeTimers ?? []).length > 0) {
    fail(
      `src/renderer/context/store.ts names ${p108.storeTimers.join(', ')}. ` +
        `It names none of them, for the reason condition 57l gives about the ` +
        `history store: main cannot see a change on another computer, so ` +
        `there is nothing for a timer to notice and everything for it to cost.`
    );
  }
  // 58f. The three environment names that move a configuration directory.
  {
    const printed = p108.machineFactsPrints ?? [];
    const wanted = ['claude_config_dir', 'xdg_config_home', 'xdg_state_home'];
    const absent = wanted.filter((one) => !printed.includes(one));
    if (absent.length > 0) {
      fail(
        `machine-facts does not print ${absent.join(', ')}. It prints all ` +
          `three. Without them a remote read points at ~/.claude on a machine ` +
          `where the person moved their configuration, and the panel draws an ` +
          `empty Skills section and is wrong rather than empty.`
      );
    }
  }
  // 58g. The caps hold, and the head -c literal is the compiled constant.
  if (p108.listMax !== 100000) {
    fail(
      `CONTEXT_READ_LIST_MAX_BYTES is ${String(p108.listMax)}. It is 100,000, ` +
        `the per call cap on the read list: a longer list becomes more calls ` +
        `in the same pass, and the composed command stays inside the one ` +
        `131,072 byte argument the far side's shell accepts.`
    );
  }
  if (p108.fileMax !== 33554432 || p108.headCapLiteral !== 33554432) {
    fail(
      `CONTEXT_READ_FILE_MAX_BYTES is ${String(p108.fileMax)} and the head -c ` +
        `literal in context-read is ${String(p108.headCapLiteral)}. Both are ` +
        `33,554,432, which is the reader's own bigJsonMaxBytes. Two copies of ` +
        `one number is how one of them goes stale, and this is the check that ` +
        `holds them together.`
    );
  }
  if (p108.maxPasses !== 8) {
    fail(
      `CONTEXT_READ_MAX_PASSES is ${String(p108.maxPasses)}. It is 8, the ` +
        `reader's own dependency depth: roots, children, plugins, then ` +
        `@import at its maxImportDepth of 5. Research 57 section 7.3 calls 8 ` +
        `the honest ceiling.`
    );
  }
  if (p108.enumDepth !== 2) {
    fail(
      `CONTEXT_ENUM_DEPTH is ${String(p108.enumDepth)}. It is 2. Depth 2 is ` +
        `what keeps pass 2 from becoming two passes, and blind depth 7 on ` +
        `~/.claude/plugins costs 1.37 MB to find 149 files, so plugin roots ` +
        `are asked by name after the manifest parse instead.`
    );
  }
  // 58h. The renderer's remote note is real, so a remote list cannot draw as
  // a local one and a cut list cannot draw as a whole one.
  if (p108.viewPresent !== true) {
    fail(
      'src/renderer/context/ContextView.tsx is not there, so nothing draws ' +
        'the configuration this feature reads.'
    );
  } else {
    const drawn = p108.viewHonestyNames ?? [];
    const wanted = [
      'contextOnMachineLine',
      'CONTEXT_NESTED_NOT_LISTED',
      'contextCutLine'
    ];
    const absent = wanted.filter((one) => !drawn.includes(one));
    if (absent.length > 0) {
      fail(
        `src/renderer/context/ContextView.tsx does not name ` +
          `${absent.join(', ')}. It names all three. The first says the list ` +
          `came from the machine and that installing works on this Mac only, ` +
          `the second says nested project skills are not listed, and the ` +
          `third says the pass cap cut the list. Phase 99 carried a ` +
          `truncation flag through main that the panel never read, and a cut ` +
          `list drew as a whole one.`
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
    // PHASE 109 EXTENDED THIS CONDITION. Every execute test carries a file
    // test beside it, in both loops. `[ -x ]` alone passed a DIRECTORY with
    // the execute bit, and that path reached `argv[0]` and the manifest row.
    if (find.fileTests !== 2 || find.executeTests !== 2) {
      fail(
        `program-find pairs ${String(find.fileTests)} file test(s) with ` +
          `${String(find.executeTests)} execute test(s). It walks two lists, ` +
          `so it holds exactly two of each, and every execute test stands ` +
          `beside a file test: a directory carrying the execute bit is not a ` +
          `program, and through this script it reached the manifest row.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 59. Phase 109. The batched agent search, held to condition 46's shape
// ---------------------------------------------------------------------------
//
// Every check below reads one compiled script text out of the probe's answer.
// None of them starts a process, opens a file under the person's home, or
// contacts a machine.

{
  const batch = (data.phase109 ?? {}).agentsFind ?? null;
  if (batch === null) {
    fail(
      'the catalogue holds no script called agents-find, so a tab on another ' +
        'machine greys its agent tiles from THIS Mac\'s scan and the board ' +
        'lies about what that machine has.'
    );
  } else {
    if (batch.mode !== 'read' || batch.params !== 3) {
      fail(
        `agents-find is a ${String(batch.mode)} taking ${String(batch.params)} ` +
          `value(s). It is a read taking three, being the machine's own list, ` +
          `the install folders and the record lines.`
      );
    }
    if ((batch.bareLoops ?? []).length > 0) {
      fail(
        `agents-find walks a bare positional: ${batch.bareLoops.join(', ')}. ` +
          `Every positional is read as "$1" to "$9" and is always quoted, and ` +
          `a loop over a bare one ends that rule for the whole catalogue.`
      );
    }
    for (const one of batch.assignments ?? []) {
      if (one.at < 0) {
        fail(
          `agents-find never reads its ${one.name} value into a local name. A ` +
            `list has to be read once, in quotes, before anything splits it.`
        );
      } else if (one.loopAt < 0) {
        fail(`agents-find assigns ${one.name} and no loop walks it.`);
      } else if (one.at > one.loopAt) {
        fail(
          `agents-find walks its ${one.name} value at byte ` +
            `${String(one.loopAt)} and assigns it at byte ${String(one.at)}, ` +
            `so the loop reads a name that has not been read yet.`
        );
      }
    }
    if (batch.redirects !== 0) {
      fail(
        `agents-find carries ${String(batch.redirects)} redirection(s). It ` +
          `only asks whether files are executable, so it writes nothing ` +
          `anywhere and redirects nothing at all.`
      );
    }
    if (batch.splitsFoldersUnderIfs !== true || batch.splitsRecordsUnderIfs !== true) {
      fail(
        'agents-find does not split folders under IFS=: and records under a ' +
          'newline IFS. The colon is how every folder list is written, and ' +
          'the newline is the one separator a configured path can never hold.'
      );
    }
    if (batch.fileTests !== 3 || batch.executeTests !== 3) {
      fail(
        `agents-find pairs ${String(batch.fileTests)} file test(s) with ` +
          `${String(batch.executeTests)} execute test(s). It walks three ` +
          `lists, so it holds exactly three of each, and every execute test ` +
          `stands beside a file test from birth so it can never disagree with ` +
          `program-find about a directory carrying the execute bit.`
      );
    }
    if (batch.namesUnreadable !== true) {
      fail(
        'agents-find never names its unreadable section. Without it a `none` ' +
          'computed while a folder on the search list could not be read would ' +
          'read as a positive absent, and a positive absent is the one answer ' +
          'allowed to grey a tile.'
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
      .join(', ')}. ` +
    `${Object.entries(EXTRA_GIT_VERBS)
      .map(([id, verbs]) => `Only ${id} may name ${verbs.join(' or ')}`)
      .join('. ')}.\n`
);
process.stdout.write(
  `execRemoteShell is called from ${String(
    (run.shellCallers ?? []).length
  )} file(s): ${(run.shellCallers ?? []).join(', ')}. The door in remote-run.ts ` +
    `is the only one that sends a catalogue script.\n`
);

// ---------------------------------------------------------------------------
// Phase 98's line
// ---------------------------------------------------------------------------

{
  const search = (data.phase98 ?? {}).repoSearch ?? null;
  process.stdout.write(
    search === null
      ? 'repo-search is NOT in the catalogue, so a search on a machine has no ' +
          'far side at all.\n'
      : `a search on a machine runs repo-search, a ${String(search.mode)} ` +
          `taking ${String(search.params)} value(s). It names git ` +
          `${[...(search.gitVerbs ?? [])].sort().join(' and ')}, it cuts its ` +
          `answer at ${String(search.declaredMaxBytes)} bytes on ` +
          `${String(search.branches)} branch(es) and says so in its own ` +
          `answer, and it names none of ${P98_FORBIDDEN}. No search engine is ` +
          `sent to any machine.\n`
  );
}

// ---------------------------------------------------------------------------
// Phase 99's line
// ---------------------------------------------------------------------------

{
  const files = (data.phase99 ?? {}).repoFiles ?? null;
  process.stdout.write(
    files === null
      ? 'repo-files is NOT in the catalogue, so Quick Open on a machine has no ' +
          'far side at all.\n'
      : `Quick Open on a machine runs repo-files, a ${String(files.mode)} ` +
          `taking ${String(files.params)} value(s). It names git ` +
          `${[...(files.gitVerbs ?? [])].sort().join(' and ')}, it carries at ` +
          `most ${String(files.declaredMaxPaths)} names, it cuts its answer at ` +
          `${String(files.declaredMaxBytes)} bytes on ` +
          `${String(files.branches)} branch(es) and says so in its own answer, ` +
          `and it names none of ${P99_FORBIDDEN}. It carries names and never ` +
          `file contents.\n`
  );
}

// ---------------------------------------------------------------------------
// Phase 100's line
// ---------------------------------------------------------------------------

{
  const p100 = data.phase100 ?? {};
  const capture = (data.ledger ?? []).find((row) => row.verb === 'capture-pane');
  process.stdout.write(
    p100.present !== true
      ? 'src/main/machines/remote-lines.ts is NOT there, so nobody can read ' +
          'back what a session on another machine printed.\n'
      : `reading the last lines of a session on a machine sends ` +
          `${[...(p100.argvDeep ?? [])].join(' ')}, one command per read, and ` +
          `nothing else. It rides on the ${String(capture?.kind)} row ` +
          `capture-pane, repeat class ${String(capture?.repeat)}, which Phase ` +
          `72 put on the ledger and Phase 100 did not move. It offers ` +
          `${[...(p100.depths ?? [])].join(', ')} lines, cuts at ` +
          `${String(p100.maxBytes)} bytes on this Mac, names neither verb a ` +
          `scrollbar would need, and writes nothing on either computer. ` +
          `Research 57 section 3.1 refused the scrollbar and this is the ` +
          `smaller affordance it adopted.\n`
  );
}

// ---------------------------------------------------------------------------
// Phase 105's line
// ---------------------------------------------------------------------------

{
  const p105 = data.phase105 ?? {};
  const script = p105.script ?? null;
  process.stdout.write(
    script === null || p105.present !== true
      ? 'repo-facts or src/main/machines/remote-runs.ts is NOT there, so the ' +
          'Runs section on a tab whose project lives on another machine has no ' +
          'far side at all.\n'
      : `the Runs section on a machine runs repo-facts, a ${String(script.mode)} ` +
          `taking ${String(script.params)} value(s). It names git ` +
          `${[...(p105.gitVerbs ?? [])].sort().join(' and ')} and nothing else, ` +
          `it asks with --git-common-dir and never --absolute-git-dir, and it ` +
          `names none of ${P105_CREDENTIAL_WORDS}. The one gh command is ` +
          `${[...(p105.ghArgv ?? [])].slice(0, 6).join(' ')} …, it is composed ` +
          `on THIS MAC, the allowlist accepts it as a read, and no credential ` +
          `and no gh crosses the link.\n`
  );
}

// ---------------------------------------------------------------------------
// Phase 106's line
// ---------------------------------------------------------------------------

{
  const p106 = data.phase106 ?? {};
  const script = p106.script ?? null;
  process.stdout.write(
    script === null || p106.present !== true
      ? 'repo-branch or src/main/machines/remote-branch.ts is NOT there, so the ' +
          'Branch group on a tab whose project lives on another machine has no ' +
          'far side at all.\n'
      : `the Branch group on a machine runs repo-branch, a ${String(script.mode)} ` +
          `taking ${String(script.params)} value(s). It names git ` +
          `${[...(p106.gitVerbs ?? [])].sort().join(' and ')} and nothing else, ` +
          `it asks with --git-common-dir and never --absolute-git-dir, and its ` +
          `format plus %(subject) is BRANCH_FORMAT, so the far side and ` +
          `parseForEachRefBranches cannot drift. It names none of git fetch, ` +
          `git pull or git remote update, so the two counts are measured ` +
          `against the copy of the upstream that machine already had and ` +
          `nothing was fetched on it. It can never change what is checked out ` +
          `over there.\n`
  );
}

// Phase 107. What the History group on a remote tab runs, said out loud.
{
  const p107 = data.phase107 ?? {};
  const script = p107.script ?? null;
  process.stdout.write(
    script === null || p107.present !== true
      ? 'repo-history or src/main/machines/remote-history.ts is NOT there, so ' +
          'the History group on a tab whose project lives on another machine ' +
          'has no far side at all.\n'
      : `the History group on a machine runs repo-history, a ` +
          `${String(script.mode)} taking ${String(script.params)} value(s). It ` +
          `names git ${[...(p107.gitVerbs ?? [])].sort().join(', ')} and ` +
          `nothing else, it asks with --git-common-dir and never ` +
          `--absolute-git-dir, and the format it asks with is GRAPH_LOG_FORMAT ` +
          `itself, so the far side and parseGraphLog cannot drift. It walks ` +
          `--branches --tags --remotes and names none of --stdin, --all, ` +
          `refs/stash and refs/notes, so no ref name is a value at any point ` +
          `and sanitizeRefNames stays on this side of the link. It reads at ` +
          `most ${String(p107.ceiling)} commits in one answer, a page being ` +
          `${String(p107.page)}, which is about 135,000 base64 bytes at the ` +
          `ceiling against 5,400,000 for the 20,000 a local walk allows. The ` +
          `panel names all three of hasMore, atCeiling and ` +
          `divergenceTruncated, so nothing that was cut is drawn as whole. It ` +
          `names none of git fetch, git pull or git remote update, and it can ` +
          `never check out, branch or cherry pick over there.\n`
  );
}

// Phase 108. What the Context view on a remote tab runs, said out loud.
{
  const p108 = data.phase108 ?? {};
  const script = p108.script ?? null;
  process.stdout.write(
    script === null || p108.driverPresent !== true
      ? 'context-read or src/main/machines/remote-agent-context.ts is NOT ' +
          'there, so the Context view on a tab whose project lives on another ' +
          'machine has no far side at all.\n'
      : `the Context view on a machine runs context-read, a ` +
          `${String(script.mode)} taking ${String(script.params)} value(s). ` +
          `It names NO git verb, because context is not a git question. The ` +
          `reader that resolves the per agent precedence runs on this Mac and ` +
          `the far side only lists directories and sends file bytes back, so ` +
          `there is no second table and conformance:context proves the one ` +
          `matrix for both kinds of tab. machine-facts carries ` +
          `claude_config_dir, xdg_config_home and xdg_state_home, so the read ` +
          `follows a moved configuration directory. The list cap is ` +
          `${String(p108.listMax)} bytes per call, one file is cut at ` +
          `${String(p108.fileMax)} bytes by head -c, the walk depth is ` +
          `${String(p108.enumDepth)} and the pass cap is ` +
          `${String(p108.maxPasses)}. The panel names contextOnMachineLine, ` +
          `CONTEXT_NESTED_NOT_LISTED and contextCutLine, so a remote list ` +
          `never draws as a local one and a cut list never draws as a whole ` +
          `one. It writes nothing, and install, enable and pin are refused on ` +
          `a remote tab permanently.\n`
  );
}


// ---------------------------------------------------------------------------
// 69 to 73. Phase 117. A create whose answer nobody could read
// ---------------------------------------------------------------------------
//
// THE NUMBERS ARE 69 TO 73 AND NOT 50 TO 54. The numbered list at the top of
// this file stops at 49 and the file already holds conditions up to 68, so the
// next free numbers are these. Nothing is renumbered.
//
// 69. The confirmation has other than three kinds, a kind maps to the wrong
//     action, or `dropRemoteRow` is called from anywhere but the two arms that
//     already had it, being a proven absence and an answer that is not an
//     identifier. A durable row deleted from a third place is the defect this
//     phase closed coming back.
// 70. More than one production place writes `unknown` into a session's status
//     column, `markRemoteCreateUnconfirmed` has other than one caller, or the
//     create's unreachable arm does not call it. One writer is what makes the
//     column readable: a row reads `unknown` exactly when its create was never
//     confirmed and nothing has proved it either way since.
// 71. The classifier answers `provenAbsent` for anything but a completed answer
//     from tmux itself. The default sits on `unreachable`, and that default is
//     the whole of the fix.
// 72. The confirmation argv names `GMUX_SESSION_ID` on the line. MEASURED on
//     tmux 3.6a, 2026-08-17, and recorded in the header of
//     `src/main/machines/pane-env-rescue.ts`: naming the variable makes tmux
//     exit 1 for the ordinary case, so an error that says "not there" and an
//     error that says nothing become the same error. That is exactly the
//     distinction this phase exists to make.
// 73. The seed accepts a row naming this Mac, a row with no id or no machine,
//     or overwrites an entry the CURRENT run issued. The live record carries
//     the values this run sent and a seeded one carries what a past run
//     recorded, so the live one wins.
//
// The seventh restore arm is condition 26's business, because it is the gate's
// own table, and the four Phase 117 rows in GATE_AT_SPEC above are where it is
// checked.

{
  const p117 = data.phase117 ?? {};

  // --- 69. The three kinds, and one action each ----------------------------
  const kinds = [...(p117.kinds ?? [])];
  if (JSON.stringify(kinds) !== JSON.stringify(['present', 'provenAbsent', 'unreachable'])) {
    fail(
      `the create confirmation declares ${kinds.join(', ') || 'nothing'}. It ` +
        `is exactly present, provenAbsent and unreachable. A read with two ` +
        `answers is the read that deleted a row for a session that was running.`
    );
  }
  const WANTED_DISPOSITION = {
    present: 'bind',
    provenAbsent: 'dropRow',
    unreachable: 'keepUnknown'
  };
  for (const row of p117.dispositions ?? []) {
    const wanted = WANTED_DISPOSITION[String(row.kind)];
    if (wanted === undefined) {
      fail(`the confirmation produced a kind nobody named: ${String(row.kind)}`);
      continue;
    }
    if (row.disposition !== wanted) {
      fail(
        `a ${String(row.kind)} confirmation leads to ${String(row.disposition)} ` +
          `and it must lead to ${wanted}.`
      );
    }
  }
  const dropCallers = p117.dropCallers ?? [];
  if (dropCallers.length !== 2) {
    fail(
      `dropRemoteRow is called from ${String(dropCallers.length)} place(s) and ` +
        `there are exactly two: the arm where tmux itself answered that the ` +
        `session is not there, and the arm where the answer was not an ` +
        `identifier at all. Every other failure keeps the row.\n` +
        dropCallers.map((one) => `      ${one.file}:${String(one.line)}`).join('\n')
    );
  }
  if ((p117.dropNamedElsewhere ?? []).length > 0) {
    fail(
      `dropRemoteRow is named outside remote-sessions.ts, in ` +
        `${(p117.dropNamedElsewhere ?? []).join(', ')}. It deletes a durable ` +
        `row and it stays private to the module that writes them.`
    );
  }

  // --- 70. One writer, one reader ------------------------------------------
  const unknownWriters = p117.unknownWriters ?? [];
  if (unknownWriters.length !== 1) {
    fail(
      `${String(unknownWriters.length)} production place(s) write the unknown ` +
        `status into a session row, and there is exactly one, being ` +
        `markRemoteCreateUnconfirmed. A second writer makes the column mean ` +
        `two things and nothing can read it.\n` +
        unknownWriters.map((one) => `      ${one.file}:${String(one.line)}`).join('\n')
    );
  } else if (!String(unknownWriters[0].file).endsWith('remote-record.ts')) {
    fail(
      `the unknown status is written from ${String(unknownWriters[0].file)} ` +
        `and the one writer lives in src/main/machines/remote-record.ts.`
    );
  }
  const markCallers = p117.markCallers ?? [];
  if (markCallers.length !== 1) {
    fail(
      `markRemoteCreateUnconfirmed has ${String(markCallers.length)} caller(s) ` +
        `and it has exactly one, being the create's unreachable arm.\n` +
        markCallers.map((one) => `      ${one.file}:${String(one.line)}`).join('\n')
    );
  } else if (!String(markCallers[0].file).endsWith('remote-sessions.ts')) {
    fail(
      `markRemoteCreateUnconfirmed is called from ` +
        `${String(markCallers[0].file)} and its one caller is the create in ` +
        `src/main/machines/remote-sessions.ts.`
    );
  }
  if (p117.markDefinedIn !== 1 || p117.readerDefinedIn !== 1) {
    fail(
      `remote-record.ts declares markRemoteCreateUnconfirmed ` +
        `${String(p117.markDefinedIn)} time(s) and unconfirmedRemoteRecords ` +
        `${String(p117.readerDefinedIn)} time(s). One of each.`
    );
  }
  if (p117.createArmMarks !== true || p117.createArmThrows !== true) {
    fail(
      `the create's unreachable arm ` +
        `${p117.createArmMarks === true ? 'marks the row' : 'does NOT mark the row'} ` +
        `and ` +
        `${p117.createArmThrows === true ? 'throws the lost answer sentence' : 'does NOT throw the lost answer sentence'}. ` +
        `An arm that keeps the row without writing the column leaves a row ` +
        `nothing can read back after a restart.`
    );
  }

  // --- 71. Only a completed answer from tmux may prove an absence ----------
  const PROVEN = [
    'tmux holds no server at all',
    'tmux named the session as missing',
    'tmux said there is no such session',
    'the session was not found'
  ];
  const failureRows = p117.failures ?? [];
  if (failureRows.length < 10) {
    fail(
      `the classifier was driven over ${String(failureRows.length)} shape(s) ` +
        `and there are ten. A shape nobody drove is a shape nobody compared ` +
        `against the table.`
    );
  }
  for (const row of failureRows) {
    const wanted = PROVEN.includes(String(row.name)) ? 'provenAbsent' : 'unreachable';
    if (row.answer !== wanted) {
      fail(
        `"${String(row.name)}" was classified ${String(row.answer)} and the ` +
          `table says ${wanted}. Only an answer tmux itself completed may ` +
          `delete a durable row.`
      );
    }
  }
  for (const row of p117.environment ?? []) {
    const wanted =
      String(row.name) === 'this create own id is on a line of its own'
        ? 'present'
        : 'provenAbsent';
    if (row.answer !== wanted) {
      fail(
        `the environment read of "${String(row.name)}" answered ` +
          `${String(row.answer)} and it should answer ${wanted}.`
      );
    }
  }

  // --- 71a. The classifier reads structure, not constructor identity ------
  //
  // PHASE 200. The 0.98.0 audit read this gate's condition 71 failing on the
  // one completed answer, being "tmux holds no server at all" classified
  // unreachable while the table says provenAbsent. The rows above cannot show
  // that, because the probe builds them with the same copy of
  // `src/main/errors` the classifier imported, so `instanceof` answers yes and
  // the nominal read works by luck. Under a second loader it answers no, the
  // code and the detail are never read, and the one sentence that may delete a
  // durable row reads as an answer nobody could read.
  //
  // So this arm drives the same classifier over values built by a SECOND COPY
  // of that module, plus the malformed shapes a structural reader has to
  // refuse. Its first assertion is that the two copies really are different
  // classes: if a future runtime dedupes them, this arm proves nothing and
  // says so rather than passing.
  const mixed = p117.mixedLoader ?? {};
  const mixedRows = mixed.rows ?? [];
  // name -> [verdict, answer]. Written here rather than read from the probe,
  // so the probe cannot grade itself.
  const MIXED_TABLE = new Map([
    ['a completed no server answer built by a second loader', ['no-server', 'provenAbsent']],
    ['a session named as missing by a second loader', ['not-confirmed', 'provenAbsent']],
    ['a machine that could not be reached, from a second loader', ['not-confirmed', 'unreachable']],
    ['a plain object carrying nothing but the payload shape', ['no-server', 'provenAbsent']],
    ['malformed: the payload is a string', ['not-confirmed', 'unreachable']],
    ['malformed: the payload is an array', ['not-confirmed', 'unreachable']],
    ['malformed: the code is a number', ['not-confirmed', 'unreachable']],
    ['malformed: a code this release never named', ['not-confirmed', 'unreachable']],
    ['malformed: the message is missing', ['not-confirmed', 'unreachable']],
    ['malformed: the detail is not text', ['not-confirmed', 'unreachable']],
    ['malformed: the payload is null', ['not-confirmed', 'unreachable']]
  ]);
  if (mixed.sameClass !== false) {
    fail(
      `the second copy of src/main/errors is the SAME class as the first, so ` +
        `the mixed loader arm proves nothing. It exists to drive the ` +
        `classifier over a value whose constructor identity differs, which is ` +
        `the shape the 0.98.0 audit met. An arm that cannot fail is not an arm.`
    );
  }
  if (mixedRows.length !== MIXED_TABLE.size) {
    fail(
      `the mixed loader arm drove ${String(mixedRows.length)} shape(s) and the ` +
        `table names ${String(MIXED_TABLE.size)}. A shape nobody drove is a ` +
        `shape nobody compared against the table.`
    );
  }
  for (const row of mixedRows) {
    const wanted = MIXED_TABLE.get(String(row.name));
    if (wanted === undefined) {
      fail(
        `the mixed loader arm drove "${String(row.name)}", which the table in ` +
          `this gate does not name. Add the row and its two answers here.`
      );
      continue;
    }
    if (row.instanceofHere !== false) {
      fail(
        `"${String(row.name)}" IS an instanceof this process's own GmuxError, ` +
          `so it never crossed the loader boundary this arm exists to cross.`
      );
    }
    if (String(row.verdict) !== wanted[0]) {
      fail(
        `serverProbeVerdict answered ${String(row.verdict)} for ` +
          `"${String(row.name)}" and the table says ${wanted[0]}. The verdict ` +
          `must read the payload's SHAPE, because constructor identity is not ` +
          `stable across loaders and this is the sentence that deletes a ` +
          `durable row.`
      );
    }
    if (String(row.answer) !== wanted[1]) {
      fail(
        `"${String(row.name)}" was classified ${String(row.answer)} and the ` +
          `table says ${wanted[1]}. ` +
          (wanted[1] === 'provenAbsent'
            ? `A completed answer from tmux stays completed when it arrives ` +
              `from a second loader.`
            : `A payload that is not exactly the shape this release writes is ` +
              `refused whole and the durable row is kept.`)
      );
    }
  }

  // --- 72. The variable is not on the read line ----------------------------
  const argv = (p117.argv ?? []).map(String);
  if (argv.some((one) => one.includes('GMUX_SESSION_ID'))) {
    fail(
      `the confirmation read names GMUX_SESSION_ID on the line: ` +
        `${argv.join(' ')}. MEASURED on tmux 3.6a, 2026-08-17: naming the ` +
        `variable makes tmux exit 1 for the ordinary case, and the exec plane ` +
        `turns a non zero exit into a thrown error, so an error meaning "not ` +
        `there" and an error meaning "no answer" become one error. Telling ` +
        `those two apart is the whole of this phase.`
    );
  }
  if (argv[0] !== 'show-environment' || argv[1] !== '-t' || !String(argv[2] ?? '').startsWith('=')) {
    fail(
      `the confirmation read is ${argv.join(' ')} and it is ` +
        `show-environment -t =NAME. The = is an exact name match, which is the ` +
        `rule every other verb in this directory follows.`
    );
  }
  if (argv.length !== 3) {
    fail(
      `the confirmation read carries ${String(argv.length)} argument(s) and it ` +
        `carries three.`
    );
  }
  {
    // The exact match target has to survive the far side's login shell. This is
    // condition 20's rule applied to the one other place a `=NAME` target is
    // sent. MEASURED 2026-08-20 with the zsh macOS ships, being 5.9:
    //   zsh -c 'echo =p117-absent-1'   -> zsh:1: p117-absent-1 not found
    //   zsh -c "echo '=p117-absent-1'" -> =p117-absent-1
    // An unquoted word beginning with = is expanded into a program path, so the
    // read never reaches tmux and the answer is an error nobody can read. That
    // is indistinguishable from a machine that did not answer, which is exactly
    // the distinction this phase exists to make.
    const call = String(p117.quotedCall ?? '');
    const target = call.slice(call.lastIndexOf('-t ') + 3);
    if (!target.startsWith("'") || !target.endsWith("'")) {
      fail(
        `the confirmation read composes ${JSON.stringify(call)}, whose target ` +
          `${JSON.stringify(target)} is unquoted. MEASURED 2026-08-20 with zsh ` +
          `5.9: a word beginning with = is expanded into a program path, so an ` +
          `unquoted exact match target never reaches tmux. Condition 20 holds ` +
          `the remote attach to the same rule and the same measurement.`
      );
    }
  }

  // --- 73. The seed --------------------------------------------------------
  const seed = p117.seed ?? {};
  if (seed.added !== 1) {
    fail(
      `the seed accepted ${String(seed.added)} row(s) out of five, and exactly ` +
        `one of the five is acceptable. The other four are an id this run ` +
        `already issued, a row naming this Mac, a row with no id and a row ` +
        `with no machine.`
    );
  }
  if (seed.liveName !== 'the name this run sent') {
    fail(
      `the seed overwrote an entry the current run issued: the name now reads ` +
        `${JSON.stringify(seed.liveName)}. The live record carries the values ` +
        `this run sent and a seeded one carries what a past run recorded.`
    );
  }
  if (seed.pastHeld !== true) {
    fail('the seed did not take the one row a past run left unconfirmed');
  }
  if (seed.localHeld === true) {
    fail(
      'the seed took a row naming this Mac. The issued set is about sessions ' +
        'on other machines, and a local row in it would let a probe on a ' +
        'machine adopt a session this Mac holds.'
    );
  }
  if (seed.emptyHeld === true || seed.namelessHeld === true) {
    fail('the seed took a row with no id or no machine on it');
  }
  if (JSON.stringify([...(seed.onStudio ?? [])]) !== JSON.stringify(['live', 'past'])) {
    fail(
      `after the seed the machine holds ${(seed.onStudio ?? []).join(', ')} ` +
        `and it holds exactly live and past.`
    );
  }
  if ((seed.onLocal ?? []).length !== 0) {
    fail(
      `the seed left ${String((seed.onLocal ?? []).length)} id(s) against this ` +
        `Mac and it leaves none.`
    );
  }
  if (p117.seedDefinedIn !== 1 || p117.heldDefinedIn !== 1) {
    fail(
      `pane-env-rescue.ts declares seedIssuedRemoteIds ` +
        `${String(p117.seedDefinedIn)} time(s) and issuedRemoteIdHeld ` +
        `${String(p117.heldDefinedIn)} time(s). One of each.`
    );
  }

  // The confirmation must be decidable from what it is given. An import of the
  // manifest, of tmux or of the exec plane would mean the answer depends on
  // something a reviewer cannot see from the page.
  const ALLOWED_CONFIRM_IMPORTS = ['../errors', '../tmux/errors'];
  for (const one of (p117.confirmImports ?? []).map(String)) {
    if (ALLOWED_CONFIRM_IMPORTS.includes(one)) continue;
    fail(
      `src/main/machines/create-confirmation.ts imports ${JSON.stringify(one)}, ` +
        `which is not on its allowed list. The table has to be decidable from ` +
        `the answer or the error alone.`
    );
  }
}

// ---------------------------------------------------------------------------
// 74 to 78. Phase 118. Who owns a long running child, and where a removal lives
// ---------------------------------------------------------------------------
//
// THE NUMBERS ARE 74 TO 78. The numbered list at the top of this file stops at
// 49 and the file already holds conditions up to 73, so the next free numbers
// are these. Nothing is renumbered.
//
// 74. A file under src/main/machines/ other than the exec plane calls
//     `execFileP`, or the exec plane has other than two such call sites. Every
//     long running remote child in this product goes through those two lines,
//     and the ledger is installed at them and nowhere else. A third one is a
//     child nobody owns, which is the defect this phase closed.
// 75. `execution-ledger.ts` names `killProcessGroup` on a line of code.
//     `execFile` does not forward `detached`, so its child sits in Electron's
//     own process group and `kill(-pid)` would signal Tortie itself. The header
//     of that file explains it at length, so only code lines are read here.
// 76. `execution-ledger.ts` imports anything from `remote-record.ts`. The boot
//     edge runs one way, from the record module to the ledger, so no cycle is
//     added.
// 77. `removeMachineRow` or `tombstoneRemoteRows` is called from any file but
//     `removal.ts`, or `removeMachineCompletely` is declared other than once.
//     Before Phase 118 the two were called from two files, and the second ran
//     whatever the first did.
// 78. The body of `tombstoneRemoteRows` holds a `try`. A per row failure caught
//     there is exactly the defect this phase removes, and it is checked as a
//     shape rather than trusted.
//
// The boundary in the ledger, being which of the five kinds is written down
// durably, is printed as a table below rather than asserted, because it is a
// deliberate choice and the table is where a later reader argues with it.

{
  const p118 = data.phase118 ?? {};

  // --- 74. Two spawn sites, and both in the exec plane ---------------------
  const sites = p118.spawnSites ?? [];
  const outside = sites.filter(
    (row) => String(row.file) !== 'src/main/machines/exec-plane.ts'
  );
  if (outside.length > 0) {
    fail(
      `${String(outside.length)} long running remote child(ren) are spawned ` +
        `outside the exec plane: ` +
        `${outside.map((row) => `${String(row.file)}:${String(row.line)}`).join(', ')}. ` +
        `The ledger is installed at the exec plane's two lines and nowhere ` +
        `else, so a child spawned anywhere else is a child nobody owns at quit.`
    );
  }
  if (sites.length !== 2) {
    fail(
      `the exec plane has ${String(sites.length)} execFileP call site(s) and ` +
        `it has exactly two: the tmux verb door and the login shell door. A ` +
        `third one is a child the ledger never sees.`
    );
  }

  // --- 75. A pid, never a process group -------------------------------------
  const group = p118.ledgerKillsGroup ?? [];
  if (group.length > 0) {
    fail(
      `src/main/machines/execution-ledger.ts names killProcessGroup on ` +
        `${String(group.length)} line(s) of code. execFile does not spawn ` +
        `detached, so the ssh child sits in Electron's own process group and ` +
        `signalling the group would signal Tortie itself.`
    );
  }

  // --- 76. The boot edge runs one way ---------------------------------------
  const backEdge = p118.ledgerNamesRemoteRecord ?? [];
  if (backEdge.length > 0) {
    fail(
      `src/main/machines/execution-ledger.ts reaches ./remote-record.ts on ` +
        `${String(backEdge.length)} line(s) of code. That module imports the ` +
        `ledger, so this would be a cycle.`
    );
  }

  // --- 77. The order of a removal lives in one file --------------------------
  for (const [what, rows] of [
    ['removeMachineRow', p118.removeRowCallers ?? []],
    ['tombstoneRemoteRows', p118.tombstoneCallers ?? []]
  ]) {
    const strays = rows.filter(
      (row) => String(row.file) !== 'src/main/machines/removal.ts'
    );
    if (strays.length > 0) {
      fail(
        `${what} is called from ` +
          `${strays.map((row) => `${String(row.file)}:${String(row.line)}`).join(', ')}. ` +
          `The whole order of a removal lives in removal.ts, so the machines ` +
          `file can only be rewritten after the record has been written.`
      );
    }
  }
  if (p118.removalDefines !== 1) {
    fail(
      `removeMachineCompletely is declared ${String(p118.removalDefines)} ` +
        `time(s) and it is declared once.`
    );
  }

  // --- 78. A per row failure can never be swallowed again --------------------
  const body = String(p118.tombstoneBody ?? '');
  if (body === '') {
    fail('tombstoneRemoteRows was not found in src/main/machines/remote-record.ts');
  } else if (/\btry\b/.test(body)) {
    fail(
      `the body of tombstoneRemoteRows holds a try. A per row failure caught ` +
        `there is the exact defect Phase 118 removed: the loop kept going, the ` +
        `machines file was rewritten anyway, and the person was left with some ` +
        `records written and some not.`
    );
  }

  // --- The boundary, printed rather than asserted ----------------------------
  const kinds = (p118.kinds ?? []).map(String);
  const outcomes = (p118.outcomes ?? []).map(String);
  if (kinds.length !== 5) {
    fail(
      `the ledger declares ${String(kinds.length)} kind(s) of remote work and ` +
        `it declares five.`
    );
  }
  if (outcomes.length !== 4) {
    fail(
      `the ledger declares ${String(outcomes.length)} outcome(s) and it ` +
        `declares four.`
    );
  }
  if (!kinds.includes(String(p118.journaled))) {
    fail(
      `the journaled kind reads ${JSON.stringify(p118.journaled)} and it is ` +
        `not one of the kinds the ledger declares.`
    );
  }
  process.stdout.write('\nremote work: kind         written down durably\n');
  for (const kind of kinds) {
    process.stdout.write(
      `             ${kind.padEnd(12)} ${
        kind === String(p118.journaled) ? 'yes' : 'no'
      }\n`
    );
  }
  process.stdout.write(
    `             every one of them ends as one of ${outcomes.join(', ')}.\n` +
      `             Only a copy writes on the other computer, so only a copy ` +
      `is written down.\n`
  );
}

// ---------------------------------------------------------------------------
// 79 and 80. Phase 101. The sixth field, and the sentence that weakened
// ---------------------------------------------------------------------------
//
// 79 asks nine questions about `writeRoot`, mirroring the eight the accepted
// version block asks, plus the one that block has no equivalent of.
//
// 80 is the checkable sentence, and it is checked PER BRANCH of each write
// script rather than per script.

{
  const w = data.writeRootFacts ?? null;
  if (w === null) {
    fail(
      'the probe printed nothing about the write root field, so condition 79 ' +
        'checked nothing at all.'
    );
  } else {
    // --- 79a. The hash moves for the sixth field, in both directions --------
    if (w.set === w.unset) {
      fail(
        'naming a folder Tortie may save under left the confirm hash ' +
          'unchanged. A person would be able to let Tortie replace files on ' +
          'another computer without the sheet ever moving.'
      );
    }
    if (w.set === w.setOther) {
      fail(
        'two different folders hashed to the same value, so an agreement to ' +
          'save under one folder would carry to another.'
      );
    }
    if (w.backToUnset !== w.unset) {
      fail(
        'clearing the folder does not hash back to what the row hashed to ' +
          'before it was named, so withdrawing saving would leave the machine ' +
          'permanently unconfirmed.'
      );
    }

    // --- 79b. A machine with no folder is not asked again -------------------
    if (w.unset !== UNACCEPTED_HASH_2026_08_18) {
      fail(
        `a machine with no accepted version and no write root now hashes to ` +
          `${String(w.unset)} and it hashed to ${UNACCEPTED_HASH_2026_08_18} ` +
          'before Phase 101. Every machine every person confirmed would be ' +
          'asked to confirm it again.'
      );
    }
    if (w.unsetCanonicalCarriesKey) {
      fail(
        'the hash text of a row with no write root carries the key anyway, ' +
          'which is the same hole stated above.'
      );
    }
    if (!w.canonicalCarriesRoot) {
      fail(
        'the hash text of a row WITH a write root does not carry the folder, ' +
          'so the grant is not covered by the hash at all.'
      );
    }

    // --- 79c. The sheet names the folder ------------------------------------
    const sheetSaysIt = (w.sheetLines ?? []).some((line) =>
      String(line).includes('/Users/gdc')
    );
    if (!sheetSaysIt) {
      fail(
        'the sheet a person reads does not name the folder they would be ' +
          'granting, so the lines and the hash do not say the same thing.'
      );
    }

    // --- 79d. The field is on the appended list -----------------------------
    if (!(w.appendedFields ?? []).includes('writeRoot')) {
      fail(
        'writeRoot is not on the list of keys the hash text appends, so it ' +
          'would be emitted for every row and every confirmation would break.'
      );
    }

    // --- 79e. A write root survives an ordinary re-confirm ------------------
    if (!String(w.movedHostCanonical ?? '').includes('/Users/gdc')) {
      fail(
        'a row whose host moved while a write root is set does not carry the ' +
          'folder in its canonical text. The re-confirm sheet would then grant ' +
          'file replacement without saying so, which is the door this phase ' +
          'exists to keep shut.'
      );
    }

    // --- 79f. The honesty paragraph, and where it may not appear ------------
    if (w.honestyWhenSet !== w.honestyText) {
      fail(
        'describeMachine answers ' +
          `${JSON.stringify(w.honestyWhenSet)} for a row with a write root ` +
          'rather than MACHINE_WRITE_HONESTY, so a sheet granting file ' +
          'replacement could be drawn without the paragraph that says what ' +
          'replacement costs.'
      );
    }
    if (w.honestyWhenUnset !== null) {
      fail(
        'describeMachine answers a write honesty paragraph for a row with no ' +
          'write root, so a machine Tortie cannot save on would tell a person ' +
          'it can.'
      );
    }
    if (w.honestyInLines) {
      fail(
        'MACHINE_WRITE_HONESTY appears in the sheet lines. That list is ' +
          'exactly the hashed facts, and a paragraph the hash does not cover ' +
          'must not be in it.'
      );
    }
    if (w.honestyInCanonical) {
      fail(
        'MACHINE_WRITE_HONESTY appears in the canonical text the hash covers. ' +
          'Rewording it would then invalidate every confirmation.'
      );
    }
  }
}

{
  const b = data.writeBranches ?? null;
  // THE SENTENCE, PRINTED SO IT STAYS CHECKABLE RATHER THAN BECOMING A CLAIM.
  //
  // It weakened in Phase 101, on purpose. It read "no command Tortie sends can
  // replace a file somebody already had", which was true while every write
  // refused a destination that was already there. `file-put` replaces a file on
  // purpose, so that sentence cannot hold and pretending it does would be the
  // worse outcome.
  //
  // This exact string is the one the operator's decisions block of 2026-08-19
  // wrote. Research 57 section 4.4 words the same rule with the word "current"
  // in it. The block binds, so the block's wording is the one in this gate.
  //
  // PHASE 103 SCOPED IT, and the scope is written here rather than left for a
  // later round to rediscover. Read literally, `git add` and `git rm --cached`
  // both rewrite `.git/index`, which is a file the person already had and whose
  // contents Tortie never checksummed. So the sentence is scoped to FILES
  // TORTIE NAMES AS A DESTINATION. Neither Phase 103 script names a destination
  // at all: each hands a list of pathspecs to that machine's own git and lets
  // git decide what to write, which is exactly what a person running the same
  // command in a session on that machine would get. A repository's own index is
  // outside the sentence. The scope is a scope rather than a weaker claim,
  // because the thing the sentence protects is a person's file and the index is
  // not one.
  const SENTENCE =
    'no command Tortie sends can replace a file whose contents Tortie did ' +
    'not just verify by checksum';
  if (b === null) {
    fail(
      'the probe printed nothing about the write scripts per branch, so ' +
        'condition 80 checked nothing at all.'
    );
  } else {
    if (!b.imagePutRefusesExisting) {
      fail(
        'image-put no longer refuses a destination that is already there, so ' +
          `${SENTENCE} is false on that script.`
      );
    }
    if (!b.gitCloneRefusesExisting) {
      fail(
        'git-clone no longer refuses a destination that is already there, so ' +
          `${SENTENCE} is false on that script.`
      );
    }
    if (!b.filePutArmsFound) {
      fail(
        'file-put has no new arm and no checksum arm this gate can find, so ' +
          'condition 80 cannot read either of them and is checking nothing.'
      );
    }
    if (!b.filePutNewArmRefusesExisting) {
      fail(
        "file-put's new arm does not refuse a destination that is already " +
          `there. ${SENTENCE}, and a request to MAKE a file must never replace ` +
          'one. A whole-script test would have passed this on the checksum arm ' +
          'alone, which is why this condition reads each arm on its own.'
      );
    }
    if (!b.filePutSumArmComputesChecksum || !b.filePutSumArmComparesChecksum) {
      fail(
        "file-put's checksum arm does not compute the file's checksum and " +
          `compare it against $3. ${SENTENCE}, and that comparison is the ` +
          'whole of how the sentence is true.'
      );
    }
    if (!b.filePutComparesBeforeWriting) {
      fail(
        'file-put compares the checksum after it has already written, so the ' +
          'comparison decides nothing.'
      );
    }
    if (!b.filePutProbesChecksumFirst) {
      fail(
        'file-put does not look for a checksum program before either arm. The ' +
          'nosum answer has to mean nothing was written, and it only means ' +
          'that when the probe is above everything that writes.'
      );
    }
    if (!b.filePutRunsChecksumFirst) {
      fail(
        'file-put finds a checksum program before either arm but never RUNS ' +
          'one there. Finding a program says nothing about whether it ' +
          'answers, and a shasum on PATH that exits 0 and prints nothing then ' +
          'makes the script write the file and answer nosum afterwards. A ' +
          'verifier drove exactly that. The fix is to ask the program for the ' +
          'checksum of /dev/null before either arm and decide nosum on what ' +
          'it said.'
      );
    }
    const lateWords = [...(b.filePutRefusalWordsAfterWrite ?? [])];
    if (lateWords.length > 0) {
      fail(
        `file-put prints ${lateWords.join(', ')} after the line that writes. ` +
          'Every one of those words is reported to a person as "Nothing was ' +
          'written." and after that line something was. This is the exact ' +
          'defect the first fix round of Phase 101 closed, and it is checked ' +
          'here rather than asserted in a comment because a comment said the ' +
          'opposite while the script did this.'
      );
    }
    if (!b.filePutSaysUnsureAfterWrite) {
      fail(
        'file-put has no answer for a write that landed and cannot be ' +
          'described, so a checksum program that stops answering between the ' +
          'probe and the write would print a malformed line rather than the ' +
          'word main reads as "nobody can tell".'
      );
    }
    if (b.filePutNamesRm) {
      fail(
        'file-put names rm. It replaces a file and it never removes one.'
      );
    }
    if (
      !b.filePutHasRootCase ||
      !b.filePutHasRootDotDotCase ||
      !b.filePutHasRelCase ||
      !b.filePutMovesIntoPlace
    ) {
      fail(
        'file-put has lost one of its containment lines or its move into ' +
          'place, and condition 38 should have said so first.'
      );
    }
    process.stdout.write(
      `\nthe checkable sentence, per branch of each write script:\n` +
        `  ${SENTENCE}.\n` +
        `  image-put   refuses a destination that is already there\n` +
        `  git-clone   refuses a destination that is already there\n` +
        `  file-put    new arm refuses a destination that is already there\n` +
        `  file-put    checksum arm compares the file's checksum against $3 ` +
        `before it writes\n` +
        `  file-put    runs the checksum program before either arm, so nosum ` +
        `is decided before anything is written\n` +
        `  file-put    prints none of nosum, stale, missing, exists, nomode ` +
        `after the line that writes\n` +
        `  dir-new     refuses a destination that is already there\n` +
        `  entry-rename tests its destination before it moves, and the two ` +
        `stat spellings tell one entry from two\n` +
        `  WHAT NO SENTENCE HERE COVERS: between entry-rename's test and its ` +
        `mv, another writer on that machine can create the destination and the ` +
        `mv then replaces it. This gate reads text and cannot see a race. No ` +
        `number for whether mv -n narrows that window exists anywhere in this ` +
        `repository.\n` +
        `  THE SENTENCE IS SCOPED TO FILES TORTIE NAMES AS A DESTINATION. ` +
        `git-stage and git-unstage name none: they hand pathspecs to that ` +
        `machine's own git and git decides what to write.\n` +
        `  A repository's own index sits outside the sentence, and Phase 103 ` +
        `says so rather than pretending the sentence still reads literally ` +
        `true.\n`
    );
  }
}

// ---------------------------------------------------------------------------
// 81 and 82. Phase 102. The two writers this phase added, and what bounds them
// ---------------------------------------------------------------------------
//
// 81 reads `src/main/machines/remote-entry.ts` as text and asserts the SHAPE of
// the consent, being that the gate, the confirmed folder and containment for
// every path all stand above the one call that sends. It also asserts that
// neither input type has a member called `root`, which is what makes the
// sentence "no root crosses either channel" checkable rather than claimed.
//
// 82 asserts the catalogue moved by exactly two writers and that the two ids
// are the ones this phase names.
//
// Both are pure. They read source text and one compiled catalogue. They start
// nothing, open no file under the person's home and contact no machine.

{
  const entry = data.phase102 ?? {};
  const module = entry.module ?? null;
  if (module === null) {
    fail(
      'the probe printed nothing about src/main/machines/remote-entry.ts, so ' +
        'condition 81 checked nothing at all.'
    );
  } else {
    if (!module.present) {
      fail(
        'src/main/machines/remote-entry.ts is not there, so the two write ' +
          'verbs this phase adds have no module that owns their consent.'
      );
    }
    // 81a. The gate, the confirmed folder and containment all stand ABOVE the
    //      one call that sends. An order that put any of them after the send
    //      would be a check that decides nothing.
    for (const [what, at] of [
      ['assertMachineMayConnect, through confirmedWriteRoot', module.gateAt],
      ['the confirmed folder read', module.rootAt],
      ['relativeUnderRoot', module.containAt]
    ]) {
      if (at < 0) {
        fail(
          `src/main/machines/remote-entry.ts never names ${what}. Every path ` +
            `it sends is bounded by the confirmed folder on the machine row, ` +
            `and a value read out of that row at call time is a confirmed fact ` +
            `only because the agreement covers it.`
        );
      } else if (module.sendAt < 0 || at > module.sendAt) {
        fail(
          `src/main/machines/remote-entry.ts names ${what} at ` +
            `${String(at)} and calls runRemoteWrite at ` +
            `${String(module.sendAt)}. A check after the send decides nothing.`
        );
      }
    }
    // 81b. Containment is applied once per path, and a rename has two.
    if (module.containCalls < 3) {
      fail(
        `src/main/machines/remote-entry.ts calls relativeUnderRoot ` +
          `${String(module.containCalls)} time(s). It needs three, being one ` +
          `for the new folder and one for each end of a rename. A rename with ` +
          `an unchecked destination could move a person's file out of the ` +
          `folder they confirmed.`
      );
    }
    // 81c. One door, and it is the write door.
    if (!module.namesWriteDoor) {
      fail(
        'src/main/machines/remote-entry.ts never calls runRemoteWrite, so ' +
          'either the two verbs went somewhere else or this gate is reading ' +
          'the wrong file.'
      );
    }
    for (const forbidden of module.forbiddenDoors ?? []) {
      fail(
        `src/main/machines/remote-entry.ts names ${forbidden}. Every write in ` +
          `this product goes through runRemoteWrite and through no other door.`
      );
    }
    // 81d. NO ROOT CROSSES. The two input types carry a path each and no
    //      member called `root`, so a folder chosen in the renderer cannot
    //      decide what is written under.
    if ((module.rootMembers ?? []).length > 0) {
      fail(
        `the Phase 102 input types carry a member called root, being ` +
          `${module.rootMembers.join(' and ')}. Main reads the confirmed folder ` +
          `off the machine row, and a root chosen in the renderer would make ` +
          `{root: '/Users/greg', path: '.ssh'} reachable.`
      );
    }
    // 81e. The manifest boundary. `remote-record.ts` is the one place a remote
    //      path meets the manifest and this phase does not widen that.
    if (module.importsManifest) {
      fail(
        'src/main/machines/remote-entry.ts imports from ../manifest/. The one ' +
          'place a remote path meets the manifest is remote-record.ts, and the ' +
          'machines rung reading manifest rows would break the boundary ' +
          'remote-sessions.ts records.'
      );
    }
    // 81f. The handlers pass through and compose nothing.
    for (const [channel, ok] of [
      ['machines:makeDir', module.handlerMakeDir],
      ['machines:renameEntry', module.handlerRename]
    ]) {
      if (ok) continue;
      fail(
        `the ${channel} handler in src/main/machines/ipc.ts does not call the ` +
          `one export in remote-entry.ts that owns it. A handler that composed ` +
          `its own values would be a second place the write decision lives.`
      );
    }
  }
}

{
  // 82. The catalogue moved by exactly two writers, and they are these two.
  const writers82 = (data.remoteRun ?? {}).writers ?? [];
  const added = writers82.filter(
    (id) => id === 'dir-new' || id === 'entry-rename'
  );
  if (added.length !== 2) {
    fail(
      `the catalogue's write list names ${added.join(', ') || 'neither'} of ` +
        `dir-new and entry-rename. Phase 102 adds exactly those two and no ` +
        `third, and it adds them at the END of the list so the three that ` +
        `shipped before it keep their order.`
    );
  }
  if (writers82[3] !== 'dir-new' || writers82[4] !== 'entry-rename') {
    fail(
      `the catalogue's write list reads ${writers82.join(', ') || 'nothing'}. ` +
        `The two Phase 102 ids are the fourth and the fifth, in that order.`
    );
  }
  const modes = (data.phase102 ?? {}).catalogue ?? [];
  for (const row of modes) {
    if (row.mode === 'write') continue;
    fail(
      `${row.id} is a ${String(row.mode)} in the catalogue. Both Phase 102 ` +
        `scripts write, and a write reached through the read door is refused ` +
        `by remote-run.ts before anything is composed.`
    );
  }
  for (const row of modes) {
    const wanted = row.id === 'dir-new' ? 2 : 3;
    if (row.params === wanted) continue;
    fail(
      `${row.id} declares ${String(row.params)} value(s) and it reads ` +
        `${String(wanted)}.`
    );
  }
  process.stdout.write(
    `\nthe two writers Phase 102 added:\n` +
      `  dir-new       2 values, answers made, exists, denied or noparent. One ` +
      `mkdir with no -p, then one chmod capped at 755 or 700.\n` +
      `  entry-rename  3 values, answers moved, done, exists or gone. One mv, ` +
      `after a device and inode test that closes the case only rename.\n` +
      `  the catalogue now holds ${String(REMOTE_SCRIPT_COUNT)} scripts of ` +
      `which ${String(ALLOWED_WRITERS.length)} write.\n` +
      `  no confirmed field was added, so the sheet still covers six fields ` +
      `and no machine is asked again.\n` +
      `  .git is guarded on these two and NOT on file-put, which keeps ` +
      `review-file's narrower line.\n`
  );
}

// ---------------------------------------------------------------------------
// 83. Phase 103. The discard refusal, made executable over the whole catalogue
// ---------------------------------------------------------------------------
//
// Discard is not in this phase and this condition makes it UNREACHABLE rather
// than merely absent. A brief that adds a discard verb, a `git clean`, a
// `git restore` carrying `--worktree` or `--source`, or a `git rm` without
// `--cached` has been written wrong.
//
// THE RULE IS SPELLED THIS WAY FOR TWO REASONS, and both are corrections.
// The obvious spelling, being "restore may appear only with --staged or with
// --source", is the one research 57 section 5.7 drafts. It passes
// `git restore --source=HEAD -- p`, which overwrites the working tree file, and
// it passes `git restore --staged --worktree -- p`, which does the same. Both
// are the operation section 5.7 refuses. So `--source` is refused OUTRIGHT over
// the whole catalogue rather than allowed as an alternative, which costs
// nothing because `--source` appears nowhere in `src/main/git/service.ts` at
// all.
//
// It reads every script in the catalogue and not only the two this phase added.

{
  const DISCARD_RULE = [
    'no catalogue script may name git clean, at all, ever',
    'restore may appear only with --staged, never with --worktree and never ' +
      'with --source',
    'rm may appear only with --cached',
    '--source is refused outright over the whole catalogue'
  ];
  for (const row of scripts) {
    if (row.text.includes('git clean')) {
      fail(
        `remote script ${row.id} names git clean. It deletes files on ` +
          `somebody else's computer that git has never been told about, and ` +
          `there is no undo for it anywhere.`
      );
    }
    if (row.text.includes('--source')) {
      fail(
        `remote script ${row.id} names --source. git restore --source=REV ` +
          `overwrites the working tree copy, which is a discard under another ` +
          `name, and it is refused outright rather than allowed beside ` +
          `--staged.`
      );
    }
    for (const line of row.text.split('\n')) {
      if (line.includes('git restore')) {
        if (!line.includes('--staged')) {
          fail(
            `remote script ${row.id} runs git restore without --staged on the ` +
              `line ${JSON.stringify(line.trim())}. Without it the restore ` +
              `overwrites the copy in that person's folder.`
          );
        }
        if (line.includes('--worktree')) {
          fail(
            `remote script ${row.id} runs git restore with --worktree on the ` +
              `line ${JSON.stringify(line.trim())}. It overwrites the copy in ` +
              `that person's folder even when --staged is there too.`
          );
        }
      }
      if (/\bgit rm\b/.test(line) && !line.includes('--cached')) {
        fail(
          `remote script ${row.id} runs git rm without --cached on the line ` +
            `${JSON.stringify(line.trim())}. Without it the file is deleted ` +
            `from that person's folder rather than from the index.`
        );
      }
      // `rm` as a command word with no `git ` in front of it. The per script
      // exception map in condition 38 is about which words may appear at all;
      // this is about whether the word is a git verb.
      if (!/(^|[\s;|&(])rm\b/.test(line)) continue;
      if (line.includes('git rm ')) continue;
      fail(
        `remote script ${row.id} names rm as a command on the line ` +
          `${JSON.stringify(line.trim())}. The only rm this catalogue may ` +
          `hold is git rm carrying --cached.`
      );
    }
  }
  process.stdout.write(
    `\nthe discard refusal, over all ${String(scripts.length)} scripts:\n` +
      DISCARD_RULE.map((one) => `  ${one}\n`).join('')
  );
}

// ---------------------------------------------------------------------------
// 84 and 85. Phase 103. The two writers this phase added, and what bounds them
// ---------------------------------------------------------------------------
//
// 84 reads `src/main/machines/remote-stage.ts` as text and asserts the SHAPE of
// the containment, being that the confirm gate, the fresh review read, the root
// test and the reported set test all stand above the one call that sends.
//
// 85 asserts the catalogue moved by exactly two writers, that the two ids are
// the ones this phase names, and that the porcelain split reached the renderer.
// It asserts on the renderer's files BY SYMBOL NAME ONLY and never by a
// sentence, because a pinned sentence across a builder boundary is how a phase
// deadlocks.
//
// Both are pure. They read source text and one compiled catalogue. They start
// nothing, open no file under the person's home and contact no machine.

{
  const stage = data.phase103 ?? {};
  const module = stage.module ?? null;
  if (module === null) {
    fail(
      'the probe printed nothing about src/main/machines/remote-stage.ts, so ' +
        'condition 84 checked nothing at all.'
    );
  } else {
    if (!module.present) {
      fail(
        'src/main/machines/remote-stage.ts is not there, so the two write ' +
          'verbs this phase adds have no module that owns their containment.'
      );
    }
    // 84a. All four checks stand ABOVE the one call that sends. An order that
    //      put any of them after the send would be a check that decides
    //      nothing.
    for (const [what, at] of [
      ['confirmedWriteRoot, being the confirm gate', module.gateAt],
      ['reviewFilesOn, being the fresh read', module.readAt],
      ['rootHolds, being the repository under the confirmed folder', module.holdsAt],
      ['the test that the fresh read reported the path', module.reportedAt]
    ]) {
      if (at < 0) {
        fail(
          `src/main/machines/remote-stage.ts never names ${what}. The far side ` +
            `script cannot bound the repository by the confirmed folder, ` +
            `because it receives the repository root and not that folder, so ` +
            `every layer of that check lives here.`
        );
      } else if (module.sendAt < 0 || at > module.sendAt) {
        fail(
          `src/main/machines/remote-stage.ts names ${what} at ${String(at)} ` +
            `and calls runRemoteWrite at ${String(module.sendAt)}. A check ` +
            `after the send decides nothing.`
        );
      }
    }
    // 84b. One door, and it is the write door.
    if (!module.namesWriteDoor) {
      fail(
        'src/main/machines/remote-stage.ts never calls runRemoteWrite, so ' +
          'either the two verbs went somewhere else or this gate is reading ' +
          'the wrong file.'
      );
    }
    for (const forbidden of module.forbiddenDoors ?? []) {
      fail(
        `src/main/machines/remote-stage.ts names ${forbidden}. Every write in ` +
          `this product goes through runRemoteWrite and through no other door, ` +
          `and every long running ssh child is owned by the ledger rather than ` +
          `by a caller.`
      );
    }
    // 84c. The manifest boundary. `remote-record.ts` is the one place a remote
    //      path meets the manifest and this phase does not widen that.
    if (module.importsManifest) {
      fail(
        'src/main/machines/remote-stage.ts imports from ../manifest/. The one ' +
          'place a remote path meets the manifest is remote-record.ts.'
      );
    }
    // 84d. NO REPOSITORY ROOT CROSSES. The input type carries the tab's folder
    //      and nothing else, so main reads the root off that machine's own
    //      rev-parse. A root or a repoPath member would make one call able to
    //      stage inside any repository on that machine.
    if ((module.inputMembers ?? []).length > 0) {
      fail(
        `MachineIndexWriteInput carries ${module.inputMembers.join(' and ')}. ` +
          `Main runs its own review read and uses the root that machine's own ` +
          `rev-parse answered, and a root chosen in the renderer would make ` +
          `{root: '/Users/greg/secret', paths: ['x']} reachable.`
      );
    }
    // 84e. The handlers pass through and compose nothing.
    for (const [channel, ok] of [
      ['machines:stage', module.handlerStage],
      ['machines:unstage', module.handlerUnstage]
    ]) {
      if (ok) continue;
      fail(
        `the ${channel} handler in src/main/machines/ipc.ts does not call the ` +
          `one export in remote-stage.ts that owns it. A handler that composed ` +
          `its own values would be a second place the write decision lives.`
      );
    }
    // 84f. NEITHER CHANNEL NAME AND NEITHER HANDLER BODY NAMES A GIT VERB. The
    //      verb is inside Tortie's own script text, so no caller can turn a
    //      stage into a commit, a checkout or a discard.
    for (const [what, named] of [
      ['the machines:stage handler', module.stageHandlerVerbs],
      ['the machines:unstage handler', module.unstageHandlerVerbs],
      ['the two channel names', module.channelVerbs]
    ]) {
      if ((named ?? []).length === 0) continue;
      fail(
        `${what} names ${named.join(', ')}. The git verb is part of Tortie's ` +
          `own script text in remote-scripts.ts and it is never a value a ` +
          `caller chooses.`
      );
    }
  }
}

{
  // 85. The catalogue moved by exactly two writers, and the split reached the
  //     renderer.
  const writers85 = (data.remoteRun ?? {}).writers ?? [];
  if (writers85[5] !== 'git-stage' || writers85[6] !== 'git-unstage') {
    fail(
      `the catalogue's write list reads ${writers85.join(', ') || 'nothing'}. ` +
        `The two Phase 103 ids are the sixth and the seventh, in that order, ` +
        `and they are added at the END of the list so the five that shipped ` +
        `before them keep their order.`
    );
  }
  const rows85 = (data.phase103 ?? {}).catalogue ?? [];
  for (const row of rows85) {
    if (row.mode !== 'write') {
      fail(
        `${row.id} is a ${String(row.mode)} in the catalogue. Both Phase 103 ` +
          `scripts write, and a write reached through the read door is refused ` +
          `by remote-run.ts before anything is composed.`
      );
    }
    if (row.params !== 2) {
      fail(
        `${row.id} declares ${String(row.params)} value(s) and it reads two, ` +
          `being the repository root and the list of paths.`
      );
    }
    if (!row.fits) {
      fail(
        `${row.id} is ${String(row.bytes)} bytes of text, which does not fit ` +
          `inside one argument of a Linux login shell.`
      );
    }
  }
  const split = (data.phase103 ?? {}).split ?? {};
  if (!split.contractHasIndexState || !split.contractHasWorktreeState) {
    fail(
      'MachineReviewFile in the machines contract does not carry both ' +
        'indexState and worktreeState. Without the pair the remote list cannot ' +
        'tell a staged file from an unstaged one, and the two new verbs would ' +
        'mean nothing.'
    );
  }
  if (!split.groupsExportsGroupRemoteFiles) {
    fail(
      'src/renderer/scm/groups.ts does not export groupRemoteFiles. groupFiles ' +
        'cannot be reused unchanged, because its first branch sends every ' +
        'conflicted file to a Merge group this phase does not build.'
    );
  }
  if (!split.groupRemoteFilesNamesIsConflict) {
    fail(
      'groupRemoteFiles does not name isConflict. A conflicted row goes to ' +
        'Changes and to nowhere else, and reusing that one function is what ' +
        'keeps the local rule and the remote rule one rule.'
    );
  }
  if (!split.sectionNamesGroupRemoteFiles) {
    fail(
      'src/renderer/scm/ScmSection.tsx does not name groupRemoteFiles, so a ' +
        'remote list could draw one group while the contract carries two ' +
        'characters.'
    );
  }
  process.stdout.write(
    `\nthe two writers Phase 103 added:\n` +
      `  git-stage     2 values, one git add per call. The chunk loop spawns ` +
      `nothing, because set -- "$@" ":(literal)$p" is a builtin, so 100 paths ` +
      `cost the same one git add that 1 path costs.\n` +
      `  git-unstage   2 values, one git restore --staged per call, with one ` +
      `git rm --cached as the unborn branch fallback, decided on that machine ` +
      `from that machine's own stderr.\n` +
      `  the catalogue now holds ${String(REMOTE_SCRIPT_COUNT)} scripts of ` +
      `which ${String(ALLOWED_WRITERS.length)} write.\n` +
      `  no confirmed field was added, so the sheet still covers six fields ` +
      `and no machine is asked again.\n` +
      `  WHAT THE FAR SIDE CANNOT CHECK: $1 is the repository root and not the ` +
      `folder the person confirmed, so neither script can bound the repository ` +
      `by that folder the way file-put, dir-new and entry-rename all can. ` +
      `Condition 84 above reads the four layers that make that check in main.\n`
  );
}

// ---------------------------------------------------------------------------
// 86. Phase 104. The eighth writer, and what bounds the one commit it makes
// ---------------------------------------------------------------------------
//
// It reads `src/main/machines/remote-commit.ts` as text and asserts the SHAPE
// of the containment, being that the confirm gate, the root test, the fresh
// review read and the staged set comparison all stand above the one call that
// sends. It also asserts that the catalogue moved by exactly one writer, that
// the writer is last, and that the two numbers this phase writes in two places
// agree with each other.
//
// It asserts on Builder B's renderer files BY SYMBOL NAME ONLY and never by a
// sentence, because a pinned sentence across a builder boundary is how a phase
// deadlocks. That is condition 85's own stated rule.
//
// Pure. It reads source text and one compiled catalogue. It starts nothing,
// opens no file under the person's home and contacts no machine.

{
  const commit = data.phase104 ?? {};
  const module = commit.module ?? null;
  const row = commit.catalogue ?? null;
  if (module === null || row === null) {
    fail(
      'the probe printed nothing about src/main/machines/remote-commit.ts, so ' +
        'condition 86 checked nothing at all.'
    );
  } else {
    if (!module.present) {
      fail(
        'src/main/machines/remote-commit.ts is not there, so the write verb ' +
          'this phase adds has no module that owns its containment.'
      );
    }
    // 86a. All four checks stand ABOVE the one call that sends. An order that
    //      put any of them after the send would be a check that decides
    //      nothing. This is condition 84a's shape, read by index.
    for (const [what, at] of [
      ['confirmedWriteRoot, being the confirm gate', module.gateAt],
      ['rootHolds, being the tab folder under the confirmed folder', module.holdsAt],
      ['reviewFilesOn, being the fresh read', module.readAt],
      ['stagedPathsOf, being the staged set comparison', module.stagedAt]
    ]) {
      if (at < 0) {
        fail(
          `src/main/machines/remote-commit.ts never names ${what}. The far ` +
            `side script receives the repository root and not the folder the ` +
            `person confirmed, so every layer of that check lives here.`
        );
      } else if (module.sendAt < 0 || at > module.sendAt) {
        fail(
          `src/main/machines/remote-commit.ts names ${what} at ${String(at)} ` +
            `and calls runRemoteWrite at ${String(module.sendAt)}. A check ` +
            `after the send decides nothing.`
        );
      }
    }
    // 86b. One door, and it is the write door.
    if (!module.namesWriteDoor) {
      fail(
        'src/main/machines/remote-commit.ts never calls runRemoteWrite, so ' +
          'either the commit went somewhere else or this gate is reading the ' +
          'wrong file.'
      );
    }
    for (const forbidden of module.forbiddenDoors ?? []) {
      fail(
        `src/main/machines/remote-commit.ts names ${forbidden}. Every write in ` +
          `this product goes through runRemoteWrite and through no other door, ` +
          `and every long running ssh child is owned by the ledger rather than ` +
          `by a caller.`
      );
    }
    // 86c. The manifest boundary.
    if (module.importsManifest) {
      fail(
        'src/main/machines/remote-commit.ts imports from ../manifest/. The one ' +
          'place a remote path meets the manifest is remote-record.ts.'
      );
    }
    // 86d. NO REPOSITORY ROOT CROSSES. This is condition 84d's shape. The
    //      Phase 104 backlog entry says this input carries `repoPath`, and the
    //      gate that already shipped refuses one, so the input carries the
    //      tab's folder and main runs its own read.
    if ((module.inputMembers ?? []).length > 0) {
      fail(
        `MachineCommitInput carries ${module.inputMembers.join(' and ')}. Main ` +
          `runs its own review read and uses the root that machine's own ` +
          `rev-parse answered, and a root chosen in the renderer would make one ` +
          `call able to commit in any repository on that machine.`
      );
    }
    // 86e. The handler passes through and composes nothing.
    if (!module.handlerCommit) {
      fail(
        'the machines:commit handler in src/main/machines/ipc.ts does not call ' +
          'commitOnMachine(input). A handler that composed its own values would ' +
          'be a second place the write decision lives.'
      );
    }
    // 86f. THE HANDLER NAMES NO OTHER GIT VERB AND NO `git ` AT ALL.
    //
    //      IT IS NARROWER THAN CONDITION 84f AND THAT IS SAID RATHER THAN
    //      HIDDEN. 84f demands that neither channel name nor handler body holds
    //      any word from VERB_WORDS, which `machines:stage` and
    //      `machines:unstage` satisfy. This channel is called `machines:commit`,
    //      so the word `commit` is in its own name. Dropping the check would
    //      lose the property it exists for, so the word this operation is named
    //      after is excluded and every other verb is still refused. The full
    //      unfiltered list is printed below so a reader sees what was excluded.
    for (const [what, named] of [
      ['the machines:commit handler', module.commitHandlerVerbs],
      ['the channel name', module.channelVerbs]
    ]) {
      if ((named ?? []).length === 0) continue;
      fail(
        `${what} names ${named.join(', ')}. The git verb is part of Tortie's ` +
          `own script text in remote-scripts.ts and it is never a value a ` +
          `caller chooses.`
      );
    }
    // 86g. THE CAP IS ONE NUMBER WRITTEN IN TWO PLACES, so they cannot drift.
    //      One is the digits in the script's `head -c` and the other is the
    //      digits of the constant in the module, both read as TEXT.
    if (module.capInModule !== row.capInScript || module.capInModule <= 0) {
      fail(
        `REMOTE_COMMIT_ANSWER_MAX_BYTES reads ${String(module.capInModule)} in ` +
          `src/main/machines/remote-commit.ts and the script caps at ` +
          `${String(row.capInScript)} bytes. A constant that disagrees with the ` +
          `command it describes is a number nobody can trust.`
      );
    }
    // 86h. A REMOTE COMMIT GETS THE SAME LEASH A LOCAL ONE GETS, because hooks
    //      run inside both. The local number is read out of ../git/service.ts
    //      as text, so a later round that changes one has to change both.
    if (
      module.remoteTimeout !== module.localTimeout ||
      module.remoteTimeout <= 0
    ) {
      fail(
        `REMOTE_COMMIT_TIMEOUT_MS is ${String(module.remoteTimeout)} ms and ` +
          `COMMIT_TIMEOUT_MS in src/main/git/service.ts is ` +
          `${String(module.localTimeout)} ms. A commit on another machine runs ` +
          `the same person's hooks a local one does, so it gets the same ` +
          `deadline. The remote door's own default is 15,000 ms, which is ` +
          `shorter than one test suite.`
      );
    }
    // 86i. The catalogue row.
    if (row.mode !== 'write') {
      fail(
        `git-commit is a ${String(row.mode)} in the catalogue and it writes. A ` +
          `write reached through the read door is refused by remote-run.ts ` +
          `before anything is composed.`
      );
    }
    if (row.params !== 3) {
      fail(
        `git-commit declares ${String(row.params)} value(s) and it reads three, ` +
          `being the repository root, the sha Tortie read and the message.`
      );
    }
    if (!row.fits) {
      fail(
        `git-commit is ${String(row.bytes)} bytes of text, which does not fit ` +
          `inside one argument of a Linux login shell.`
      );
    }
    if ((row.mutators ?? []).length > 0) {
      fail(
        `git-commit names ${row.mutators.join(', ')}. It names none of the ` +
          `eleven mutating programs, and this list is MEASURED by the same ` +
          `filter condition 38 runs rather than read by eye.`
      );
    }
    // 86j. It is the eighth writer and it is at the END of the list.
    const writers86 = (data.remoteRun ?? {}).writers ?? [];
    if (writers86[7] !== 'git-commit' || writers86.length !== 8) {
      fail(
        `the catalogue's write list reads ${writers86.join(', ') || 'nothing'}. ` +
          `git-commit is the eighth and it is added at the END, because ` +
          `biggestImageCommand in the probe takes the FIRST write row and would ` +
          `otherwise measure the wrong script.`
      );
    }
    // 86k. Builder B's two files, BY SYMBOL NAME ONLY.
    if (!module.sectionNamesCommitBox) {
      fail(
        'src/renderer/scm/ScmSection.tsx does not name RemoteCommitBox, so the ' +
          'panel for a folder on another machine has no commit box and this ' +
          'channel has no caller.'
      );
    }
    if (!module.changesNamesCommit || !module.changesNamesCheckCommit) {
      fail(
        'src/renderer/scm/remote-changes.ts does not name both commit and ' +
          'checkCommit. The second is the read that answers what happened after ' +
          'an answer was lost, and a lost answer with no read to resolve it is ' +
          'the shape this phase exists to avoid.'
      );
    }
    // 86l. The guard sha is main's own field on the review answer.
    if (!module.contractHasHeadSha || !module.reviewNamesHeadSha) {
      fail(
        'MachineReviewList does not carry headSha, or ' +
          'src/main/machines/remote-review.ts does not fill it. Without the ' +
          'field the sha that guards a commit would come from the renderer.'
      );
    }
    // 86m. The summary.
    process.stdout.write(
      `\nthe one writer Phase 104 added:\n` +
        `  git-commit    3 values, being the repository root, the sha Tortie ` +
        `read and the message. One git commit per call.\n` +
        `  it is the EIGHTH write and it is last in the list, so ` +
        `biggestImageCommand still measures image-put.\n` +
        `  the catalogue now holds ${String(REMOTE_SCRIPT_COUNT)} scripts of ` +
        `which ${String(ALLOWED_WRITERS.length)} write.\n` +
        `  no confirmed field was added, so the sheet still covers six fields ` +
        `and no machine is asked again.\n` +
        `  the answer cap is ${String(module.capInModule)} bytes in the module ` +
        `and ${String(row.capInScript)} bytes in the script text.\n` +
        `  the deadline is ${String(module.remoteTimeout)} ms here and ` +
        `${String(module.localTimeout)} ms for a local commit.\n` +
        `  the redirection list is ${
          (row.redirects ?? []).length === 0
            ? 'EMPTY, measured with the probe own regex'
            : row.redirects.join(', ')
        }. That rule is weaker than image-put, which names the exact target ` +
        `every redirection must aim at.\n` +
        `  the handler and the channel name were read for git verbs with ` +
        `${(module.commitHandlerVerbsAll ?? []).join(', ') || 'none'} found ` +
        `unfiltered, and the operation own word commit excluded because the ` +
        `channel is called machines:commit.\n` +
        `  WHAT THE FAR SIDE CANNOT CHECK: $1 is the repository root and not ` +
        `the folder the person confirmed, so this script cannot bound the ` +
        `repository by that folder. Condition 86a above reads the layers that ` +
        `make that check in main.\n` +
        `  WHAT NOTHING CHECKS: the writes gate is not in the door. Eight ` +
        `callers each ask confirmedWriteRoot, which is a discipline rather ` +
        `than a door.\n`
    );
  }
}

// Phase 117. What a create whose answer was lost now does, said out loud.
{
  const p117 = data.phase117 ?? {};
  const argv = (p117.argv ?? []).map(String).join(' ');
  process.stdout.write(
    `a create on a machine confirms itself with "${argv}", which does not name ` +
      `the variable, and reads the answer as one of ` +
      `${[...(p117.kinds ?? [])].join(', ')}. Only the two answers tmux itself ` +
      `completed delete the durable row. An answer nobody could read keeps the ` +
      `row, writes unknown into its status column from the one writer there is, ` +
      `and keeps the id in the issued set, so the next run seeds that set from ` +
      `the manifest and binds the same immutable id instead of making a second ` +
      `create. Restore is refused for such a row by the gate's third arm.\n`
  );
  const mixedCount = (p117.mixedLoader ?? {}).rows?.length ?? 0;
  process.stdout.write(
    `  the answer is read from the payload's SHAPE and never from which class ` +
      `built it. ${String(mixedCount)} shapes were driven from a SECOND COPY ` +
      `of src/main/errors, none of them an instanceof this process's own ` +
      `GmuxError: the completed "no server running" answer still reads ` +
      `provenAbsent, and every malformed payload is refused whole and keeps ` +
      `the row.\n`
  );
}

if (failures.length > 0) {
  process.stdout.write(`\nFAIL, ${failures.length}:\n`);
  for (const failure of failures) process.stdout.write(`  - ${failure}\n`);
  process.exit(1);
}

process.stdout.write(
  '\nPASS. A machine confirmation is bound to the six fields that decide what runs, to ' +
    'the prefixed id, and to nothing else. Nothing was started by this gate.\n'
);
