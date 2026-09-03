#!/usr/bin/env node
/**
 * `npm run conformance:credentials`, the gate on the store Tortie keeps
 * accounts in (Phase 204).
 *
 * About four seconds. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, OPENS NO KEYCHAIN, makes no request and reads
 * nothing under the person's home: the keychain is a function written from the
 * measurement, the file system is a bag of strings, and the only real paths
 * are the repository and scratch directories it makes and removes. Every
 * runtime number it prints came from the SHIPPING modules, run under node by
 * build/credentials-conformance-probe.mts.
 *
 * ## Why a gate rather than unit tests alone
 *
 * This is the domain that writes the person's credentials, so the rules that
 * matter are the ones a later round could delete without breaking a test
 * written before the deletion. There are two kinds of check here and only the
 * second kind is new:
 *
 *   - IT SCANS THE REAL SOURCE for the refusals, being the payload never on a
 *     command line, `-A` never passed, the person's own store refused by name,
 *     one write and only one, and not a log line anywhere in the domain.
 *   - IT GOES RED UNDER ABLATION. Every rule below is re-run over an ablated
 *     copy of the shipping domain, and a rule that stays green under its own
 *     ablation is a rule that cannot fail, which proves nothing.
 *
 * ## The rules
 *
 *   1. THE CAPTURE. A store that changed is kept, and when the ACCOUNT changed
 *      rather than the token, the account that was there is promoted into a
 *      login of Tortie's own named from its address, holding the bytes that
 *      were in the store BYTE FOR BYTE. Both providers, claude out of the
 *      account file beside the credential and codex out of the id token claim.
 *   2. THE ROUND TRIP MATRIX. Every ordered pair of three accounts, switched,
 *      switched back, and at every hop all three are still there byte for byte
 *      and the store the chosen login runs under really holds its account.
 *   3. THE INTERRUPTED WRITE. The shipping write, stopped after each of its
 *      three steps over a real login directory: the store holds the old
 *      credential or the new one, never neither, and it is still a credential.
 *   4. THE ROLLBACK. A staged copy that does not read back equal leaves the
 *      store exactly as it was, on a vendor store and on Tortie's own alike,
 *      and the refusal names no payload.
 *   5. THE PERSON'S OWN LOCATION IS NEVER A WRITE TARGET. Both providers
 *      answer no target for it, choosing the default writes nothing, and not
 *      one path outside the login directories is written in that whole arm.
 *   6. A STORE UNDER A RUNNING SESSION IS REFUSED, in a sentence.
 *   7. A STORE CAUGHT MID CHANGE IS NOT CAPTURED, and nothing already kept is
 *      forgotten by it.
 *   8. THE ATTACK SHAPES: a truncated credential, valid JSON that is not a
 *      credential, a store Tortie's own keychain refuses, a store that becomes
 *      unreadable, two switches at once, and an expired credential.
 *   9. NO TOKEN BYTE. Not in an event, a fact, an answer, a refusal, the record
 *      file, the logins file or ANY command line, over an arm that really runs
 *      the keychain path so the command lines exist to be checked.
 *  10. THE KEYCHAIN PATH END TO END, over a `security` that behaves the way the
 *      real one was measured to on 2026-09-02: the bytes are exact, the account
 *      attribute is preserved, the person's own item is untouched, the payload
 *      went over STDIN, `-A` was never passed, and no staged item is left.
 *  11. The gate is named in package.json, in build/verification-checks.mjs and
 *      in CLAUDE.md, because a gate nothing names is how a gate decays.
 *  12. TWO OVERLAPPING OBSERVES leave one login, one surviving record row, the
 *      store's bytes, two answers that agree, and a later list that still says
 *      the account can be put back. An ordinary visit to the Agents page
 *      issues more than one list at once, so this is the common case rather
 *      than a hostile one, and thirteen ablations passed while it was broken.
 *  14. NOTHING IS LEFT HOLDING A CREDENTIAL BESIDE A STORE. A crash runs no
 *      `finally`, and real kills left a whole credential staged in two arms of
 *      three. A later write to the same store replaces it, because staging
 *      overwrites on both backends; the store that is never written again is
 *      swept by the first observe of the next run.
 *  13. A STORE THAT NAMES NO ACCOUNT ON EITHER SIDE still keeps what it
 *      replaced, because a login signed into a moment ago has no address until
 *      it takes a turn and that is exactly when a person types `/login` again.
 *      The cost of keeping on doubt is bounded in the same arm: ten refreshes
 *      of such a store leave ONE login rather than nine, and ten refreshes of
 *      a store that does name itself leave none.
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[credentials]';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOMAIN = join(repoRoot, 'src/main/credentials');

const failures = [];
const notes = [];
function check(ok, sentence) {
  if (!ok) failures.push(sentence);
}

// ---------------------------------------------------------------------------
// The scanners. Each is proved on fixtures this file writes, so a scan that
// cannot fail is never mistaken for a scan that passed.
// ---------------------------------------------------------------------------

/** Comment text removed, so a sentence about `-A` is not a use of it. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Does this file put a credential on a command line?
 *
 * THE ONE WRITE COMMAND is a template literal whose payload is HEX, handed to
 * `security -i` over stdin. Anything else that names `add-generic-password`
 * inside an ARRAY is an argv, and an argv is readable by every process on the
 * machine for as long as the call lives. That is the shape orca has and this
 * phase refused.
 */
function payloadOnACommandLine(text) {
  const body = stripComments(text);
  const found = [];
  const re = /add-generic-password/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    // Walk back to the nearest quote that opens this literal.
    const before = body.slice(Math.max(0, m.index - 2), m.index);
    if (!before.includes('`')) found.push('add-generic-password not in a template');
  }
  // A payload handed to `run` as part of an argv array rather than as stdin.
  if (/run\(\s*\[[^\]]*\bpayload\b[^\]]*\]/.test(body)) {
    found.push('a payload inside a run argv array');
  }
  if (/run\(\s*\[[^\]]*\bhex\b[^\]]*\]/.test(body)) {
    found.push('a hex payload inside a run argv array');
  }
  return found;
}

/** Does this file ever pass `-A`, which trusts every program on the machine? */
function passesAllowAll(text) {
  const body = stripComments(text);
  return /['"`]-A['"`]/.test(body);
}

/** Does this file write a log line, which is where a token would land? */
function writesALog(text) {
  const body = stripComments(text);
  return /\bconsole\s*\.|\bgetLog\s*\(|\blog\s*\.(info|warn|error|debug)\s*\(/.test(
    body
  );
}

/** Which files call a swap target's commit, which must be exactly one. */
function commitsAWrite(text) {
  return /\.commit\s*\(/.test(stripComments(text));
}

/** Is the person's own location refused by name, as the first thing? */
function refusesTheDefaultStore(text) {
  const body = stripComments(text);
  const at = body.indexOf('export async function storeTarget');
  if (at < 0) return false;
  const open = body.indexOf('{', at);
  if (open < 0) return false;
  const head = body.slice(open, open + 220);
  return /if\s*\(\s*dir\s*===\s*null[^)]*\)\s*return null;/.test(head);
}

// ---------------------------------------------------------------------------
// The scans, over the real source.
// ---------------------------------------------------------------------------

const domainFiles = readdirSync(DOMAIN)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => join(DOMAIN, f));
check(domainFiles.length >= 7, `${TAG} the credentials domain has fewer files than expected`);

let committers = 0;
for (const file of domainFiles) {
  const name = file.slice(repoRoot.length + 1);
  const text = readFileSync(file, 'utf8');
  for (const why of payloadOnACommandLine(text)) {
    failures.push(`${TAG} ${name} PUTS A CREDENTIAL ON A COMMAND LINE: ${why}`);
  }
  check(!passesAllowAll(text), `${TAG} ${name} passes -A, which trusts every program on the machine with the person's credential`);
  check(!writesALog(text), `${TAG} ${name} writes a log line, so a token has somewhere to land`);
  if (commitsAWrite(text)) committers += 1;
}
check(
  committers === 1,
  `${TAG} ${String(committers)} files in the domain commit a write; there must be exactly one, being swap.ts`
);
check(
  refusesTheDefaultStore(readFileSync(join(DOMAIN, 'stores.ts'), 'utf8')),
  `${TAG} storeTarget no longer refuses the person's own location as its first act`
);
notes.push(
  `${String(domainFiles.length)} files scanned, 1 write, no -A, no log line, no payload on a command line`
);

// ---------------------------------------------------------------------------
// The scanners, proved on fixtures. Some must pass and some must fail.
// ---------------------------------------------------------------------------

const FIXTURES = [
  {
    name: 'the shipping write shape',
    text: 'const command = `add-generic-password -U -a "${a}" -s "${s}" -X "${hex}"\\n`;\nawait runner.run([\'-i\'], command);\n',
    onCommandLine: false,
    allowAll: false,
    logs: false
  },
  {
    name: 'a comment naming the flag',
    text: '// It never passes -A and never names add-generic-password on an argv.\nconst a = 1;\n',
    onCommandLine: false,
    allowAll: false,
    logs: false
  },
  {
    name: 'the payload as an argv',
    text: "await runner.run(['add-generic-password', '-U', '-w', payload]);\n",
    onCommandLine: true,
    allowAll: false,
    logs: false
  },
  {
    name: 'the hex as an argv',
    text: "await runner.run(['add-generic-password', '-X', hex]);\n",
    onCommandLine: true,
    allowAll: false,
    logs: false
  },
  {
    name: 'the allow all flag',
    text: "await runner.run(['add-generic-password', '-A', '-s', service], cmd);\n",
    onCommandLine: true,
    allowAll: true,
    logs: false
  },
  {
    name: 'a console line',
    text: "console.log('kept', service);\n",
    onCommandLine: false,
    allowAll: false,
    logs: true
  },
  {
    name: 'a scoped logger',
    text: "const log = getLog('credentials');\nlog.info('x', {});\n",
    onCommandLine: false,
    allowAll: false,
    logs: true
  },
  {
    name: 'a word that merely contains one',
    text: 'const catalog = 1;\nexport const dialog = catalog;\n',
    onCommandLine: false,
    allowAll: false,
    logs: false
  }
];
let behaved = 0;
for (const f of FIXTURES) {
  const onCommandLine = payloadOnACommandLine(f.text).length > 0;
  const allowAll = passesAllowAll(f.text);
  const logs = writesALog(f.text);
  if (
    onCommandLine === f.onCommandLine &&
    allowAll === f.allowAll &&
    logs === f.logs
  ) {
    behaved += 1;
  } else {
    failures.push(
      `${TAG} the scanner misread the fixture "${f.name}": command line ${String(onCommandLine)} (want ${String(f.onCommandLine)}), allow all ${String(allowAll)} (want ${String(f.allowAll)}), logs ${String(logs)} (want ${String(f.logs)})`
    );
  }
}
const REFUSAL_FIXTURES = [
  {
    name: 'the shipping refusal',
    text: "export async function storeTarget(d, p, dir) {\n  if (dir === null || dir === '') return null;\n  return one(d, dir);\n}\n",
    refuses: true
  },
  {
    name: 'the refusal removed',
    text: "export async function storeTarget(d, p, dir) {\n  return one(d, dir);\n}\n",
    refuses: false
  },
  {
    name: 'a refusal in some other function',
    text: "function other(dir) { if (dir === null) return null; }\nexport async function storeTarget(d, p, dir) {\n  return one(d, dir);\n}\n",
    refuses: false
  }
];
for (const f of REFUSAL_FIXTURES) {
  if (refusesTheDefaultStore(f.text) === f.refuses) behaved += 1;
  else {
    failures.push(
      `${TAG} the refusal scanner misread the fixture "${f.name}"`
    );
  }
}
notes.push(
  `${String(behaved)} of ${String(FIXTURES.length + REFUSAL_FIXTURES.length)} scanner fixtures behaved`
);

// ---------------------------------------------------------------------------
// The probe, over the tree and over the ablated copies of it.
// ---------------------------------------------------------------------------

function runProbe(modules) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/credentials-conformance-probe.mts'],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        ...(modules === null ? {} : { P204_MODULES: modules })
      }
    }
  );
  if (probe.status !== 0) {
    return { error: `the probe did not run: ${(probe.stderr || '').slice(-600) || '(no output)'}` };
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return { error: `the probe printed no JSON: ${probe.stdout.slice(0, 400)}` };
  }
}

/**
 * The whole set of runtime claims, as one comparable value.
 *
 * The scoped service name derives from a temporary directory and moves every
 * run, so it is reduced to its SHAPE rather than compared verbatim. Everything
 * else is compared exactly, and an ablation must change at least one of them.
 */
/** The name of each reading, so an ablation can be told what it moved. */
const VERDICT_PARTS = [
  'capture',
  'claude',
  'roundTrip',
  'interrupted',
  'rollback',
  'rollbackOwn',
  'defaultStore',
  'running',
  'midChange',
  'attack',
  'leak',
  'noDuplicates',
  'overlap',
  'unnamed',
  'residue',
  'keychain',
  'shapes'
];

function verdict(d) {
  if ('error' in d) return ['error'];
  const keychain = { ...(d.keychain ?? {}) };
  keychain.itemsNamed = (keychain.itemsNamed ?? []).map((name) =>
    name.startsWith('Claude Code-credentials-') ? 'scoped' : name
  );
  return [
    JSON.stringify(d.capture),
    JSON.stringify(d.claude),
    JSON.stringify(d.roundTrip),
    JSON.stringify(d.interrupted),
    JSON.stringify(d.rollback),
    JSON.stringify(d.rollbackOwn),
    JSON.stringify(d.defaultStore),
    JSON.stringify(d.running),
    JSON.stringify(d.midChange),
    JSON.stringify(d.attack),
    JSON.stringify(d.leak),
    JSON.stringify(d.noDuplicates),
    JSON.stringify(d.overlap),
    JSON.stringify(d.unnamed),
    JSON.stringify(d.residue),
    JSON.stringify(keychain),
    JSON.stringify(d.shapes)
  ];
}

const live = runProbe(null);
if ('error' in live) {
  failures.push(`${TAG} ${live.error}`);
} else {
  // Rule 1.
  check(live.capture.keptFirst, `${TAG} a store's credential was not kept`);
  check(
    live.capture.promotedName === 'alice.example',
    `${TAG} THE ACCOUNT THAT WAS REPLACED WAS NOT PROMOTED: the login is ${String(live.capture.promotedName)} and a name minted from the address is alice.example`
  );
  check(
    live.capture.promotedBytesExact,
    `${TAG} THE PROMOTED LOGIN DOES NOT HOLD THE BYTES THAT WERE IN THE STORE`
  );
  check(
    live.capture.defaultNowHoldsIncoming,
    `${TAG} the rolling copy of the person's own location was not moved on`
  );
  check(
    live.capture.promotedFactsKept && live.capture.promotedFactsRestores,
    `${TAG} A LOGIN PROMOTED A MOMENT AGO HAS NO ROW OF ITS OWN, so it draws as never signed into until the next observation`
  );
  check(
    live.capture.promotedFactsEmail === 'alice@example.com',
    `${TAG} the promoted login's row does not carry the address Tortie recorded for it`
  );
  check(live.capture.ownStoreUntouched, `${TAG} THE PERSON'S OWN STORE WAS WRITTEN`);
  check(live.capture.recordHasNoToken, `${TAG} A TOKEN BYTE REACHED THE RECORD FILE`);
  check(live.capture.loginsFileHasNoToken, `${TAG} A TOKEN BYTE REACHED THE LOGINS FILE`);
  check(live.claude.promoted, `${TAG} CLAUDE PARITY IS GONE: an account change was not promoted`);
  check(
    live.claude.name === 'carol.example',
    `${TAG} the claude promotion is named ${String(live.claude.name)} rather than from its address`
  );
  check(live.claude.bytesExact, `${TAG} the promoted claude login does not hold the store's bytes`);

  // Rule 2.
  check(
    live.roundTrip.accounts.length === 3,
    `${TAG} the matrix ran over ${String(live.roundTrip.accounts.length)} accounts rather than three`
  );
  check(
    live.roundTrip.pairs.length === 6,
    `${TAG} the matrix ran ${String(live.roundTrip.pairs.length)} ordered pairs rather than six`
  );
  for (const pair of live.roundTrip.pairs) {
    check(
      pair.ok === true,
      `${TAG} A SWITCH LOST AN ACCOUNT: ${pair.from} to ${pair.to} and back answered ${JSON.stringify(pair)}`
    );
    check(
      pair.storeHolds === true,
      `${TAG} after switching back to ${pair.from} its own store does not hold its account`
    );
  }

  // Rule 3.
  for (const arm of live.interrupted) {
    check(
      arm.holdsOneOfThem,
      `${TAG} A WRITE STOPPED AFTER ${String(arm.step)} LEFT THE STORE HOLDING NEITHER CREDENTIAL`
    );
    check(arm.holdsSomething, `${TAG} a write stopped after ${String(arm.step)} emptied the store`);
    check(
      arm.stillACredential,
      `${TAG} a write stopped after ${String(arm.step)} left something that is not a credential`
    );
    check(
      arm.landedWhereExpected,
      `${TAG} a write stopped after ${String(arm.step)} left the store somewhere neither step explains`
    );
  }
  const happy = live.interrupted.find((a) => a.step === 'none');
  check(happy?.ok === true, `${TAG} the uninterrupted write did not finish`);
  check(
    happy?.stagedLeft === false,
    `${TAG} a finished write left its staged copy behind`
  );

  // Rule 4.
  check(live.rollback.refused, `${TAG} A CORRUPTED STAGED COPY WAS COMMITTED`);
  check(live.rollback.unchanged, `${TAG} a refused write changed the store anyway`);
  check(live.rollback.reasonHasNoToken, `${TAG} A REFUSAL NAMED A TOKEN`);
  check(live.rollbackOwn.refused, `${TAG} the same corruption was committed into Tortie's own store`);

  // Rule 5.
  check(
    live.defaultStore.codexTargetIsNull && live.defaultStore.claudeTargetIsNull,
    `${TAG} THE PERSON'S OWN LOCATION IS A WRITE TARGET`
  );
  check(live.defaultStore.chooseOk, `${TAG} choosing the default login was refused`);
  check(live.defaultStore.wrote === false, `${TAG} choosing the default login wrote something`);
  check(live.defaultStore.untouched, `${TAG} choosing the default login changed the person's own store`);
  check(
    live.defaultStore.pathsWritten === 0,
    `${TAG} choosing the default login wrote ${String(live.defaultStore.pathsWritten)} other paths`
  );

  // Rule 6.
  check(live.running.refused, `${TAG} A STORE WITH A SESSION RUNNING UNDER IT WAS WRITTEN`);
  check(live.running.says, `${TAG} the refusal does not say a session is running`);

  // Rule 7.
  check(
    live.midChange.kept === 0 && live.midChange.promoted === 0,
    `${TAG} A STORE CAUGHT MID CHANGE WAS CAPTURED, so half a credential can be kept`
  );
  check(live.midChange.copyUnchanged, `${TAG} a store caught mid change moved the kept copy`);
  check(
    live.midChange.loginsAdded === 0,
    `${TAG} a store caught mid change added a login`
  );

  // Rule 8.
  const attack = Object.fromEntries(live.attack.map((a) => [a.name, a]));
  check(
    attack['a truncated credential'].kept === 0 &&
      attack['a truncated credential'].slots === 0,
    `${TAG} a truncated credential was kept`
  );
  check(
    attack['valid JSON that is not a credential'].kept === 0,
    `${TAG} valid JSON that is not a credential was kept`
  );
  check(
    attack['a store Tortie owns that refuses to be kept'].refused === 1 &&
      attack['a store Tortie owns that refuses to be kept'].slots === 0,
    `${TAG} a keychain that refuses did not answer with a sentence`
  );
  check(
    attack['a store that becomes unreadable'].threw === false,
    `${TAG} A STORE THAT BECAME UNREADABLE THREW OUT OF THE DOMAIN, so one bad file stops a person seeing their logins`
  );
  check(
    attack['a store that becomes unreadable'].copyUnchanged,
    `${TAG} a store that became unreadable lost what was already kept`
  );
  check(
    attack['two switches at once'].oneSucceeded &&
      attack['two switches at once'].storeExact &&
      attack['two switches at once'].stagedLeft === false,
    `${TAG} two switches at once left the store wrong or a staged copy behind`
  );
  check(
    attack['an expired credential'].kept === 1 &&
      attack['an expired credential'].bytesExact,
    `${TAG} an expired credential was inspected rather than moved whole`
  );
  check(
    live.noDuplicates.names.length === 2,
    `${TAG} an account was promoted more than once: ${JSON.stringify(live.noDuplicates.names)}`
  );

  // Rule 12. TWO OVERLAPPING OBSERVES, which is what an ordinary mount makes.
  check(
    live.overlap.logins.length === 1,
    `${TAG} two overlapping observes made ${String(live.overlap.logins.length)} logins rather than one`
  );
  check(
    live.overlap.recordKeeps,
    `${TAG} TWO OVERLAPPING LISTS DESTROYED THE PROMOTED LOGIN'S ROW, so the account it holds is offered back to nobody, for ever`
  );
  check(
    live.overlap.bytesExact,
    `${TAG} the account kept through two overlapping observes is not the bytes that were in the store`
  );
  check(
    live.overlap.agree,
    `${TAG} two overlapping observes answered differently about the same login`
  );
  check(
    live.overlap.laterKept,
    `${TAG} a list issued after two overlapping ones draws the promoted login as never signed into`
  );

  // Rule 13. A STORE THAT NAMES NO ACCOUNT still keeps what it replaced.
  check(
    live.unnamed.promoted,
    `${TAG} A STORE NAMING NO ADDRESS ON EITHER SIDE LOST THE ACCOUNT IT REPLACED: this is the shape a person hits by signing in and typing /login before taking a turn`
  );
  check(
    live.unnamed.bytesExact,
    `${TAG} the account kept from an unnamed store is not the bytes that were in it`
  );
  check(
    live.unnamed.loginsAfterTen === 1,
    `${TAG} ten refreshes of an unnamed store made ${String(live.unnamed.loginsAfterTen)} logins rather than one, and the name minter stops at 99`
  );
  check(
    live.unnamed.namedLogins === 0,
    `${TAG} ten refreshes of ONE named account made ${String(live.unnamed.namedLogins)} logins rather than none`
  );

  // Rule 14. NOTHING IS LEFT HOLDING A CREDENTIAL BESIDE A STORE.
  check(
    live.residue.crashLeftACredential,
    `${TAG} the residue arm staged nothing, so the rest of it is a check over an empty world`
  );
  check(
    live.residue.storeUntouched,
    `${TAG} an interrupted write changed the store it was writing`
  );
  check(
    live.residue.secondWriteLeftOnlyItsOwn,
    `${TAG} a later write to the same store did not replace the credential a crash left staged there`
  );
  check(
    live.residue.nextRunSweptIt,
    `${TAG} A WHOLE CREDENTIAL LEFT BESIDE A STORE BY A CRASH IS STILL THERE after a run that observed it`
  );
  check(
    live.residue.storeStillThere,
    `${TAG} the sweep removed something that was not the staged copy`
  );

  // Rule 9 and rule 10.
  check(!live.leak.tokenInAnswers, `${TAG} A TOKEN BYTE REACHED AN ANSWER THIS DOMAIN GIVES`);
  check(live.leak.recordHasDigest, `${TAG} the record file holds no digest, so the leak scan is over an empty file`);
  check(live.keychain.promoted && live.keychain.activated, `${TAG} the keychain arm did not run to the end`);
  check(live.keychain.bytesExact, `${TAG} THE KEYCHAIN ROUND TRIP IS NOT BYTE EXACT`);
  check(live.keychain.accountPreserved, `${TAG} a write back did not preserve the item's account attribute`);
  check(live.keychain.ownItemUntouched, `${TAG} THE PERSON'S OWN KEYCHAIN ITEM WAS WRITTEN`);
  check(
    live.keychain.itemsNamed.length === 2,
    `${TAG} the keychain holds ${String(live.keychain.itemsNamed.length)} items rather than the person's own and the one login's`
  );
  check(live.keychain.argvCount > 0, `${TAG} the keychain arm made no calls, so the argv check proves nothing`);
  check(!live.keychain.tokenInArgv, `${TAG} A CREDENTIAL REACHED A COMMAND LINE`);
  check(live.keychain.payloadInStdin, `${TAG} no write went over stdin, so the argv check proves nothing`);
  check(!live.keychain.everPassedA, `${TAG} -A WAS PASSED, which trusts every program on the machine`);
  check(!live.keychain.stagedLeft, `${TAG} a staged keychain item was left behind`);

  // Rule 11's runtime half: the shapes.
  check(live.shapes.claudeOk && live.shapes.codexOk, `${TAG} a vendor credential was refused`);
  check(!live.shapes.truncated, `${TAG} a truncated credential passed the shape test`);
  check(!live.shapes.notCredential, `${TAG} JSON that is not a credential passed the shape test`);
  check(!live.shapes.apiKey, `${TAG} an API key file passed as a subscription credential`);
  check(live.shapes.slotOk, `${TAG} a slot Tortie minted was refused`);
  check(!live.shapes.slotEscape && !live.shapes.slotOther, `${TAG} a hand edited slot name was accepted`);

  notes.push(
    `${String(live.roundTrip.pairs.length)} ordered pairs switched and back with all ${String(live.roundTrip.accounts.length)} accounts intact, ${String(live.interrupted.length)} interrupted arms, ${String(live.attack.length)} attack shapes, ${String(live.keychain.argvCount)} keychain calls and no payload on any of them`
  );
}

// ---------------------------------------------------------------------------
// The ablations. Each one must change the verdict.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  {
    name: 'the person own location allowed as a write target',
    edits: [
      {
        file: 'stores.ts',
        from: "  if (dir === null || dir === '') return null;",
        to: "  if (dir === '') return null;\n  if (dir === null) dir = '/home/.codex';"
      }
    ]
  },
  {
    name: 'the read back check taken out of the one write',
    edits: [
      {
        file: 'swap.ts',
        from: '    if (staged !== payload) {',
        to: '    if (false) {'
      }
    ]
  },
  {
    name: 'the promotion of the outgoing account removed',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (before !== undefined && !sameAccountProven(before, reading)) {',
        to: '    if (false && before !== undefined) {'
      }
    ]
  },
  {
    // THE FIX ROUND'S OWN ABLATION. The rule is that an account is kept unless
    // it is PROVED to be the same one, so the ablation is the rule inverted:
    // keep only when the change is proved to be a DIFFERENT account, which is
    // what the phase shipped with and what lost an account on three real
    // shapes, being a login signed into but not yet used, the person's own
    // claude store in that same shape, and a codex file with no id token.
    name: 'the promotion made to need proof, so an unnamed store loses its account',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (before !== undefined && !sameAccountProven(before, reading)) {',
        to: '    if (before !== undefined && before.email !== null && reading.email !== null && before.email !== reading.email) {'
      }
    ]
  },
  {
    // The bound on the unnamed chain. Without it ten refreshes of a store that
    // names no account mint nine logins, and `nextKeptLoginName` stops at 99,
    // past which a promotion answers null and the account is lost outright.
    name: 'the unnamed chain left unbounded, so a token refresh mints a login',
    edits: [
      {
        file: 'keep.ts',
        from: '      ? await reusableChainLogin(d, provider, slot, kept)',
        to: '      ? null'
      }
    ]
  },
  {
    // The lock that makes two overlapping observes safe. Without it the second
    // one's write is composed from a copy taken before the first one's
    // promotion, and the promoted login's row is destroyed permanently.
    name: 'the observe lock removed, so two overlapping lists race the record file',
    edits: [
      {
        file: 'keep.ts',
        from: '  return underRootLock(d.root, () => observeOnce(d, provider));',
        to: '  return observeOnce(d, provider);'
      }
    ]
  },
  {
    // The merging write. A caller that writes back a whole file it read
    // earlier discards every row another writer added in between.
    name: 'the record write made to drop the rows it did not write itself',
    edits: [
      {
        file: 'kept.ts',
        from: '  const { file } = readKeptFile(root);\n  let moved = false;',
        to: '  const file = emptyKeptFile();\n  let moved = false;'
      }
    ]
  },
  {
    name: 'a login left with no row of its own until the next observation',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (facts.has(row.id)) continue;\n    facts.set(row.id, await factsFromSlot(d, provider, row.id, null));',
        to: '    if (facts.has(row.id)) continue;'
      }
    ]
  },
  {
    name: 'the second promotion guard removed, so one account gets many logins',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (sameAccountProven(row, before)) return null;',
        to: '    if (false) return null;'
      }
    ]
  },
  {
    // The once per run sweep, for the store that is never written again.
    name: 'the sweep removed, so a store nobody writes again keeps its residue',
    edits: [
      {
        file: 'keep.ts',
        from: '    await sweepStaged(d, provider);',
        to: '    await Promise.resolve();'
      }
    ]
  },
  {
    name: 'the settle read dropped, so a store caught mid change is captured',
    edits: [
      {
        file: 'stores.ts',
        from: '  if (second.payload !== first.payload) return null;',
        to: ''
      },
      {
        file: 'stores.ts',
        from: '  if (second.email !== first.email) return null;',
        to: ''
      }
    ]
  },
  {
    name: 'the payload put on a command line the way orca does it',
    edits: [
      {
        file: 'security.ts',
        from:
          '  const command = `add-generic-password -U -a "${account}" -s "${service}" -X "${hex}"\\n`;\n' +
          "  const { code } = await runner.run(['-i'], command);",
        to:
          "  const { code } = await runner.run([\n" +
          "    'add-generic-password',\n" +
          "    '-U',\n" +
          "    '-a',\n" +
          '    account,\n' +
          "    '-s',\n" +
          '    service,\n' +
          "    '-X',\n" +
          '    hex\n' +
          '  ]);'
      }
    ]
  },
  {
    name: 'the running session refusal removed',
    edits: [
      {
        file: 'keep.ts',
        from:
          '    running.some(\n' +
          "      (s) => s.provider === provider && sameLoginName(s.login ?? null, row.name)\n" +
          '    )',
        to: '    false'
      }
    ]
  },
  {
    name: 'the credential shape test relaxed, so anything in a store is kept',
    edits: [
      {
        file: 'payload.ts',
        from: '  const obj = parseObject(payload);\n  if (obj === null) return false;',
        to: '  const obj = parseObject(payload);\n  if (obj === null) return true;'
      }
    ]
  },
  {
    name: 'the slot name rule relaxed',
    edits: [
      {
        file: 'vault.ts',
        from: '  if (!LOGIN_PROVIDERS.includes(provider as LoginProviderId)) return false;',
        to: ''
      }
    ]
  },
  {
    name: 'the staged copy no longer discarded',
    edits: [
      {
        file: 'swap.ts',
        from: '      try {\n        await target.discard();',
        to: '      try {\n        if (false) await target.discard();'
      }
    ]
  },
  {
    name: 'the item account attribute no longer preserved on a write back',
    edits: [
      {
        file: 'stores.ts',
        from: '  const existing = await keychainAccount(d.runner, service);\n  const own = existing ?? (await ownAccountName(d));',
        to: '  const own = d.userName;'
      }
    ]
  },
  {
    name: 'a store that cannot be read throws instead of answering nothing',
    edits: [
      {
        file: 'stores.ts',
        from: '  try {\n    return await d.readText(path);\n  } catch {\n    return null;\n  }',
        to: '  return d.readText(path);'
      }
    ]
  }
];

const moves = [];
/**
 * THE ABLATED COPIES LIVE ONE LEVEL UNDER `src/main/`, and the depth is exact.
 *
 * This domain imports `../logins/dirs`, `../logins/store` and
 * `../usage/login-accounts`, because the vendor paths and the ownership rule
 * live there and duplicating either would be the Phase 203 decoy all over
 * again. A copy anywhere else cannot resolve those three, so every ablation
 * would fail to IMPORT rather than fail the rule it removed, and a suite that
 * is red for the wrong reason proves exactly as little as one that is green
 * for the wrong reason. The first two versions of this gate had that bug, one
 * copying to the system temporary directory and one nesting the copies a level
 * too deep, and both reported twelve of twelve red while proving nothing.
 *
 * So each copy is a SIBLING of `logins/` and `usage/`, its name begins with a
 * dot so neither TypeScript's include globs nor the test runner picks it up,
 * and it is removed in the `finally` below whatever happened. The live probe
 * has already run by this point, so nothing here can affect it.
 */
const ABLATION_PREFIX = `.p204-ablation-${process.pid.toString(36)}-`;
const mainDir = join(repoRoot, 'src/main');

function sweepAblations() {
  for (const name of readdirSync(mainDir)) {
    if (name.startsWith(ABLATION_PREFIX)) {
      rmSync(join(mainDir, name), { recursive: true, force: true });
    }
  }
}

try {
  const liveVerdict = JSON.stringify(verdict(live));
  let red = 0;
  for (const [i, ablation] of ABLATIONS.entries()) {
    const dir = join(mainDir, `${ABLATION_PREFIX}${String(i)}`);
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(DOMAIN).filter((n) => n.endsWith('.ts'))) {
      cpSync(join(DOMAIN, f), join(dir, f));
    }
    let applied = true;
    for (const edit of ablation.edits) {
      const target = join(dir, edit.file);
      const before = readFileSync(target, 'utf8');
      if (!before.includes(edit.from)) {
        failures.push(
          `${TAG} the ablation "${ablation.name}" found nothing to edit in ${edit.file}`
        );
        applied = false;
        break;
      }
      writeFileSync(target, before.replace(edit.from, edit.to));
    }
    if (!applied) continue;
    const ablated = runProbe(dir);
    const got = verdict(ablated);
    const was = verdict(live);
    if (got[0] === 'error') {
      // A PROBE THAT CANNOT RUN IS NOT AN ABLATION THAT WENT RED. Two earlier
      // versions of this gate counted it as one and proved nothing at all, so
      // it is a finding rather than a pass.
      failures.push(
        `${TAG} the ablation "${ablation.name}" stopped the probe running instead of moving a reading, so it proves nothing: ${String(ablated.error).slice(0, 300)}`
      );
      continue;
    }
    const moved = VERDICT_PARTS.filter((_, at) => got[at] !== was[at]);
    if (moved.length > 0) {
      red += 1;
      // A CLAUSE OWNS A READING. Saying which one is what stops an ablation
      // passing for the wrong reason and going unnoticed.
      moves.push(`${ablation.name} -> ${moved.join(', ')}`);
    } else {
      failures.push(
        `${TAG} the ablation "${ablation.name}" changed nothing this gate checks, so that rule cannot fail`
      );
    }
  }
  notes.push(`${String(red)} of ${String(ABLATIONS.length)} ablations went red`);
  if (process.env['P204_ABLATION_DETAIL'] === '1') {
    for (const line of moves) process.stdout.write(`${TAG} ablation ${line}\n`);
  }
} finally {
  sweepAblations();
}

// ---------------------------------------------------------------------------
// Rule 11. A gate nothing names is how a gate decays.
// ---------------------------------------------------------------------------

const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
check(
  pkg.includes('"conformance:credentials"'),
  `${TAG} package.json does not name conformance:credentials`
);
const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
check(
  checks.includes('conformance-credentials.mjs'),
  `${TAG} build/verification-checks.mjs does not name this gate`
);
const claudeMd = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8');
check(
  claudeMd.includes('conformance:credentials'),
  `${TAG} CLAUDE.md does not name conformance:credentials, so nobody is told to run it`
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${f}\n`);
  process.stderr.write(`${TAG} FAILED with ${String(failures.length)} finding(s)\n`);
  process.exit(1);
}
process.stdout.write(`${TAG} OK: ${notes.join('; ')}.\n`);
