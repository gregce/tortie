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
 *  10. THE KEYCHAIN PATH END TO END, over a `security` that behaves the way
 *      the real one was measured to on 2026-09-02: the bytes are exact, the write
 *      lands under the vendor rule's account rather than one copied off an item
 *      (Phase 281), the person's own item is untouched, a stray placed first
 *      under its name is untouched, the payload went over STDIN, `-A` was never
 *      passed, and no staged item is left.
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
 *      swept by the first observe of the next run. PHASE 206 added the half
 *      the sweep never reached, being TORTIE'S OWN VAULT, where the same crash
 *      leaves the whole credential at `<slot>.pending`. The arm stages into a
 *      slot the observe will NOT write, because a successful write discards
 *      its own staged place and would let the arm pass with the sweep gone.
 *  15. A PLANTED LINK AT A STAGED NAME SENDS THE WRITE NOWHERE. Every write
 *      here stages at a name nobody has opened yet, and `writeFile` follows a
 *      link, so an entry planted at one took the whole write and read back
 *      through itself so the check passed. It is the one arm over real files
 *      and real links, because a bag of strings has none and that is how the
 *      defect survived thirteen ablations.
 *  16. A LOGIN THE PERSON REMOVES LEAVES NOTHING BEHIND (Phase 206). The
 *      Phase 203 verifier found the operator's own disk holding two claude
 *      login directories while `logins.json` held one row, and the removed
 *      one's scoped keychain item still held a whole credential of his. Five
 *      shapes are driven: a stray with an item, a stray with none, a stray
 *      whose NAME collides with a live row, a stray that is a symbolic link,
 *      and a remove interrupted between its two halves. All four stores a
 *      login owns must be clear, a row the file still names must survive, and
 *      the person's own item must be neither named by a delete nor changed.
 *  13. A STORE THAT NAMES NO ACCOUNT ON EITHER SIDE still keeps what it
 *      replaced, because a login signed into a moment ago has no address until
 *      it takes a turn and that is exactly when a person types `/login` again.
 *      The cost of keeping on doubt is bounded in the same arm: ten refreshes
 *      of such a store leave ONE login rather than nine, and ten refreshes of
 *      a store that does name itself leave none.
 *  17. THE VAULT IS ONE SEALED FILE, AND THE KEYCHAIN IS READ ONCE (Phase
 *      208, rewritten by Phase 304). A scratch root and the person's root
 *      compose DIFFERENT legacy keychain names for the same slot, no name
 *      composed from any root can equal the unscoped one a tree before Phase
 *      208 wrote, the digest is re-derived here by a sha256 of this gate's
 *      own, an empty scope throws rather than composing the unscoped name,
 *      the read-through asks exactly the scoped name and nothing else and
 *      composes no `-i` line, and a slot one profile kept is invisible to
 *      another. THE READ-THROUGH is driven step by step over the measured
 *      security: a miss with a scoped item planted writes the sealed file,
 *      reads it back, and only then deletes the item, with exactly one find
 *      and one delete on the argvs; a delete the program refuses leaves the
 *      item AND the file and the next read is a hit that sends nothing; a seal
 *      that cannot be made during the read-through answers the item's bytes,
 *      writes no file and deletes nothing; a read-back that disagrees deletes
 *      nothing; and the boot pass sweeps the scoped duplicate a kill or a
 *      refused delete leaves beside a sealed file, rewriting the file first
 *      when the record names the item's bytes, and leaving BOTH in place,
 *      counted as kept, when the bytes differ and the record names neither
 *      (the fix round's clause). THE MIGRATION of the unscoped
 *      name is driven both ways over the same security and the sealed vault:
 *      present is moved into the sealed file and deleted byte for byte with no
 *      `-i` line composed, absent touches nothing, both present with the
 *      record naming the old bytes rewrites the sealed copy, a staged leftover
 *      under the old name is deleted without being moved, and a profile that
 *      is not the person's own composes NO unscoped name at all. The scan
 *      half: the unscoped composer is defined in exactly one file, migrate.ts,
 *      and the one call of the migration outside that file, in index.ts,
 *      carries the profile proof composed by ownProfileVerdict.
 *  18. THE SESSION EVIDENCE IS THREE ANSWERS, NOT TWO, AND AN UNCLASSIFIED
 *      THROW IS NOT A SUCCESSFUL SWITCH (Phase 220). Phase 211 asked which
 *      sessions are running as `.catch(() => [])`, so an answer that could not
 *      be had was byte for byte a machine with nothing running: measured at
 *      `b5cc017`, a rejected query with a default session live and a working
 *      query with no sessions at all both answered
 *      `ok=true "one.example is signed in again."` while the running agent kept
 *      the account the person had just left. The ask now happens ABOVE every
 *      write, an unavailable answer refuses with the choice unchanged and says
 *      so, and the two KNOWN answers still behave exactly as Phase 211 left
 *      them, which is what the arm holds all three against each other for. The
 *      second half is the throw nobody classified: it left `activateLogin`
 *      uncaught for the registrar to swallow, and it now answers a refusal
 *      naming the store it may have changed when nothing was confirmed, and the
 *      Phase 211 shaped partial when a write was. Neither rolls anything back,
 *      because a vendor refresh may have landed in the same window.
 *  19. THE DOMAIN HAS ONE SHUTDOWN OWNER (Phase 220). At `b5cc017` the whole of
 *      this domain's quit was `stopLoginsWatch()`: the `security` children were
 *      a raw `execFile` in no registry, the observation in flight was held by
 *      nobody once a change replaced it, the boot chain could install a watcher
 *      AFTER the ordered disposer had finished with the domain, and the
 *      migration, nine seconds of lock waits and the activation were owned by
 *      nothing at all. The runtime half of this rule is arm 12 of the probe,
 *      over the shipping lifecycle, lock and watch modules, and it spawns
 *      NOTHING: that the cancel really ends a `/usr/bin/security` is proved by
 *      `src/main/credentials/__tests__/p220-shutdown.test.ts`, which spawns a
 *      stand in that never exits. The scanned half is the two things an
 *      ablation cannot reach, being that `security.ts` runs its child through
 *      `runGuarded` with a cancel rather than a bare `execFile`, and that
 *      `disposeMainCapabilities` closes admission BEFORE its first await and
 *      awaits the join; the second is scanned because `capabilities.ts` is not
 *      in the domain the ablated copies carry, and it is proved on six fixtures
 *      of which five must make it fail.
 *  20. EVERY CALL AIMED AT CLAUDE CODE'S ITEM NAMES ITS ACCOUNT, AND NOTHING
 *      TOUCHES A STRAY (Phase 281). Claude Code names its keychain item by
 *      service AND account, and research 126 §2.4 found every call in this
 *      domain naming the service alone, so on the operator's machine a stray
 *      under another account, first under the same name, was what the observe
 *      and the backstop read and what both write targets wrote (§8.10 drove
 *      the parent committing `add -U -a "unknown"`). The probe's `security`
 *      is the first-match model now, keeping items as (service, account) rows
 *      in order, and every Phase 281 world plants a stray FIRST under every
 *      vendor name it drives. (a) Driven: every argv and every `-i` line
 *      readStore, readSettledStore, storeTarget and defaultStoreTarget through
 *      all five swap steps, forgetStore and the fingerprint send carries `-a`
 *      with the vendor account, exactly the calls pinned, the one name
 *      `CLAUDE_CONFIG_DIR` gives with no plain name after it, and no stray is
 *      named, read, rewritten or deleted. (b) Source: the vendor keychain call
 *      sites in the domain are counted against a pinned number, and each one's
 *      account is followed back to a name destructured from
 *      `claudeStoreAddress`, never a literal, a `null`, a reading's field or
 *      an account read back off an item; the ablated copies are scanned as well
 *      as probed. (c) Driven: a vendor name with a null, undefined, empty or
 *      refused account reaches the runner zero times, while the same calls with
 *      the account reach it and a name outside the namespace keeps the argv
 *      Tortie's vault always sent. (d) Driven: storeTarget for a directory with
 *      no scoped item, and defaultStoreTarget, commit under the vendor rule's
 *      account over its three shapes, being `USER`, the user name and the
 *      fallback, with the stray beside them byte identical.
 *  21. A LINE `security` WOULD CUT IS REFUSED BY ITS BYTES, AND THE PERSON IS
 *      TOLD (Phase 287). `security -i` reads at most 4,095 bytes of command per
 *      read, so 4,096 bytes with the newline is the longest line that arrives
 *      whole; past it the trailing keychain path loses its own end, nothing is
 *      written, and the program does not exit with stdin closed until it is
 *      killed. THE COUNT IS IN BYTES, measured twice and again by this phase's
 *      attacker: a 4,106 byte line of exactly 4,096 characters hung while a
 *      4,096 byte line of 4,096 characters wrote, so Phase 281.1's cap compared
 *      in UTF-16 units still SENT 4,100 bytes over a non-ASCII harness keychain
 *      path. (a) to (c) are scanned, over the tree and over every ablated copy:
 *      one declaration of `SECURITY_LINE_MAX_BYTES` at or under the measured
 *      buffer less its stated margin, no `SECURITY_LINE_MAX` left anywhere, one
 *      comparison and it names `Buffer.byteLength`, three files in the tree
 *      naming the program with the `-i` token in one of them, and the refusal
 *      ahead of the count and ahead of the spawn. (d) to (h) are driven: the cap
 *      over a string whose bytes are twice its units, the one write's line byte
 *      for byte at the cap and rejected two bytes over with its runner never
 *      called, the runner refusing the suffixed line without counting it, and
 *      then the paths a person meets it on. NARROWED TO THE VENDOR ARM BY
 *      PHASE 304: Tortie's own store is a sealed file with no ceiling (rule
 *      22), so the vault's own refusal, the observe that told the row, and the
 *      switch shapes that began in the VAULT write's refusal are gone with the
 *      case. What is left is the one store that can still refuse for size,
 *      the vendor's own keychain item: (g) a login whose vendor stage cannot
 *      take a payload the vault keeps is refused with the fixed sentence and
 *      the named reason, no `-i` line composed and the sealed copy intact;
 *      (g′) the default lift meeting that same ceiling while the login's own
 *      store already holds the account answers ok with nothing written and
 *      the reason carried, the default item byte identical, the outgoing
 *      account promoted and the choice recorded, and with no default session
 *      the same click carries no reason because nothing failed. Nothing under
 *      the cap moves, which is the last clause.
 *  22. TORTIE'S OWN VAULT HAS NO SIZE LIMIT (Phase 304). The shipping
 *      `vaultPut` and `vaultGet` over the shipping `sealedVault`, an injected
 *      seal and the measured security as the legacy arm, at 4,193 bytes (what
 *      `stat` read of the operator's own `~/.codex/auth.json`, refused by every
 *      observe since Phase 204), at 64 KB and at 1 MB: the answer's sha256
 *      equals the payload's, the file on disk is NOT the payload and holds no
 *      64 byte window of it, its mode is 0600 in a 0700 directory, the runner
 *      saw no argv on any put or on any hit, and a seal that cannot be made
 *      keeps nothing, says the one write's own sentence and leaves no file at
 *      the slot or its staged place. Scanned, over the tree and over every
 *      ablated copy: `vault.ts` names neither `keychainWrite` nor the `-i`
 *      token, and `keychainWrite` has exactly ONE caller outside `security.ts`
 *      in the domain, the vendor's own item in `stores.ts`.
 *  23. THE APPLE PUSH PROVIDER KEY IS SEALED AND READ BACK ONLY THROUGH THE
 *      SEAL (Phase 314). The shipping `apnsKeyStore` over an injected seal and
 *      a P-256 key the probe GENERATES: (a) it round trips by sha256, the one
 *      file is 0600 in a 0700 directory, is not the record, holds no
 *      `-----BEGIN` and no 64 character window of the key's base64 body, and
 *      `securityCallCount()` does not move across keep, read and forget; (b) a
 *      seal that cannot be made keeps nothing at the slot or its staged place
 *      and says the one write's sentence, a seal that cannot open reads null,
 *      and a plaintext key planted at the slot reads null; (c) a key that is
 *      not P-256, an id that is not ten of `[A-Z0-9]`, and a topic that is not
 *      a dotted bundle id are each refused whole with the field named. Rule 9
 *      is widened to it: no window of the key in any file any arm leaves
 *      behind. Scanned, over the tree and over every ablated copy: `apns-key.ts`
 *      names no keychain, no `security`, no `legacyKeychainVault`, no
 *      `defaultSecurityRunner` and no `-i`, builds exactly one
 *      `sealedVault(dir, seal, NO_LEGACY)`, writes only through
 *      `safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload)`, reads only
 *      through `backend.get`, and touches no file itself; and over `src/`, no
 *      module under the renderer, the preload or `src/shared/` names it, and
 *      its only non-test importers are `index.ts`, the harness push seam, and
 *      `src/main/push/` by `import type` alone.
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  callArguments,
  closeOf,
  functionBodyOf,
  stripComments as blankComments
} from './scan-source.mjs';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[credentials]';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOMAIN = join(repoRoot, 'src/main/credentials');

const failures = [];
const notes = [];
function check(ok, sentence) {
  if (!ok) failures.push(sentence);
}

/**
 * The domain has to be there before anything below can read it.
 *
 * WHY THIS IS A SENTENCE RATHER THAN A STACK. Run against the tree before this
 * phase, the gate exited non zero with a raw `ENOENT: scandir` and nothing a
 * reader could act on. It is right to be red there, because the rules it holds
 * did not exist yet, but every other gate in this repository says what is
 * missing in words and this one now does too. It is the first thing checked,
 * so a checkout without the domain reads as one rather than as a crash.
 */
let domainPresent = [];
try {
  domainPresent = readdirSync(DOMAIN).filter((n) => n.endsWith('.ts'));
} catch {
  process.stdout.write(
    `${TAG} FAILED: there is no credentials domain at src/main/credentials, so ` +
      'there is nothing to check. This gate is the one on the store Tortie ' +
      'keeps accounts in, which arrived in Phase 204, and a tree from before ' +
      'that phase is expected to fail here.\n'
  );
  process.exit(1);
}
if (domainPresent.length === 0) {
  process.stdout.write(
    `${TAG} FAILED: src/main/credentials holds no TypeScript file, so there is ` +
      'nothing to check.\n'
  );
  process.exit(1);
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

/**
 * Which files define or use the unscoped composer (Phase 208).
 *
 * The composer is `unscopedVaultServiceFor`, and it must be DEFINED in exactly
 * one file and USED in that same file only. A second definition or a use
 * anywhere else is a second way of naming the item every profile could reach.
 */
function unscopedComposerUses(text) {
  const body = stripComments(text);
  const defines = /export function unscopedVaultServiceFor\s*\(/.test(body);
  const mentions = (body.match(/\bunscopedVaultServiceFor\s*\(/g) ?? []).length;
  // The definition is a mention too, and it is not a use.
  return { defines, uses: defines ? mentions - 1 : mentions };
}

/**
 * Does this file call the migration with the profile proof (Phase 208)?
 *
 * Read from the call to its closing brace by matching braces, so a proof
 * elsewhere in the file does not count for a call that lacks it.
 */
function migrationCarriesTheProof(text) {
  const body = stripComments(text);
  const at = body.indexOf('migrateUnscopedVault({');
  if (at < 0) return { calls: 0, proved: false };
  let depth = 0;
  let end = -1;
  for (let i = body.indexOf('{', at); i < body.length; i += 1) {
    if (body[i] === '{') depth += 1;
    if (body[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const call = end < 0 ? '' : body.slice(at, end + 1);
  const calls = (body.match(/migrateUnscopedVault\s*\(/g) ?? []).length;
  return { calls, proved: /ownProfile:\s*ownProfileVerdict\s*\(/.test(call) };
}

/**
 * Which files define or use `defaultStoreTarget` (Phase 211).
 *
 * The default store is the one Phase 211 makes writable, and only through this
 * one function, so it must be DEFINED in stores.ts and CALLED from exactly one
 * place, being `keep.ts`'s activate. A call anywhere else is a second way to
 * write the person's own location.
 */
function defaultTargetUses(text) {
  const body = stripComments(text);
  const defines = /export async function defaultStoreTarget\s*\(/.test(body);
  const mentions = (body.match(/\bdefaultStoreTarget\s*\(/g) ?? []).length;
  return { defines, calls: defines ? mentions - 1 : mentions };
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
// PHASE 208. One composer of the unscoped name, one proved call of the move.
const composerDefiners = [];
for (const file of domainFiles) {
  const name = file.slice(repoRoot.length + 1);
  const found = unscopedComposerUses(readFileSync(file, 'utf8'));
  if (found.defines) composerDefiners.push(name);
  if (!found.defines && found.uses > 0) {
    failures.push(`${TAG} ${name} composes the UNSCOPED keychain name, which every profile on the machine can reach; only migrate.ts may`);
  }
}
check(
  composerDefiners.length === 1 && composerDefiners[0].endsWith('migrate.ts'),
  `${TAG} the unscoped composer is defined in ${composerDefiners.join(', ') || 'no file'} rather than in migrate.ts alone`
);
// PHASE 211 FIX ROUND. The real readText seam refuses a link, by name, and
// the scan is proved on two fixtures before it is believed.
function readSeamRefusesALink(text) {
  return /readText:\s*async\s*\(path\)\s*=>\s*readTextNoFollowSync\(path\)/.test(
    stripComments(text)
  );
}
check(
  readSeamRefusesALink("const d = {\n  readText: async (path) => readTextNoFollowSync(path),\n};") &&
    !readSeamRefusesALink("const d = {\n  // readText: async (path) => readTextNoFollowSync(path),\n  readText: async (path) => readFile(path, 'utf8'),\n};"),
  `${TAG} the readText seam scanner does not behave on its two fixtures`
);
check(
  readSeamRefusesALink(readFileSync(join(DOMAIN, 'index.ts'), 'utf8')),
  `${TAG} index.ts's readText seam does not go through readTextNoFollowSync, so a store that is a link is read through`
);
const proof = migrationCarriesTheProof(readFileSync(join(DOMAIN, 'index.ts'), 'utf8'));
check(
  proof.calls === 1 && proof.proved,
  `${TAG} index.ts calls the migration ${String(proof.calls)} time(s) and ${proof.proved ? 'with' : 'WITHOUT'} the profile proof composed by ownProfileVerdict`
);
for (const file of domainFiles) {
  const name = file.slice(repoRoot.length + 1);
  if (name.endsWith('index.ts') || name.endsWith('migrate.ts')) continue;
  check(
    !/migrateUnscopedVault\s*\(/.test(stripComments(readFileSync(file, 'utf8'))),
    `${TAG} ${name} calls the migration, which only index.ts may`
  );
}
// PHASE 211. The default store is writable through exactly one function, from
// exactly one caller. storeTarget still refuses dir === null for everyone else.
const defaultDefiners = [];
const defaultCallers = new Set();
let defaultCallSites = 0;
for (const file of domainFiles) {
  const name = file.slice(repoRoot.length + 1);
  const found = defaultTargetUses(readFileSync(file, 'utf8'));
  if (found.defines) defaultDefiners.push(name);
  if (found.calls > 0) {
    defaultCallers.add(name);
    defaultCallSites += found.calls;
  }
}
check(
  defaultDefiners.length === 1 && defaultDefiners[0].endsWith('stores.ts'),
  `${TAG} defaultStoreTarget is defined in ${defaultDefiners.join(', ') || 'no file'} rather than in stores.ts alone`
);
check(
  defaultCallers.size === 1 &&
    [...defaultCallers][0].endsWith('keep.ts') &&
    defaultCallSites === 1,
  `${TAG} the default store is reached from ${[...defaultCallers].join(', ') || 'nobody'} (${String(defaultCallSites)} call sites) rather than keep.ts's activate alone`
);
notes.push(
  `${String(domainFiles.length)} files scanned, 1 write, no -A, no log line, no payload on a command line, 1 unscoped composer, 1 proved migration call, 1 default-store writer reached from 1 caller`
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
// PHASE 208. The two scanners above, proved on shapes that must pass and fail.
const SCOPE_FIXTURES = [
  {
    name: 'the shipping composer',
    text: 'export function unscopedVaultServiceFor(slot: string): string {\n  return `${VAULT_SERVICE_PREFIX}${slot}`;\n}\nconst a = unscopedVaultServiceFor(x);\n',
    defines: true,
    uses: 1
  },
  {
    name: 'a second composer under another name that still calls it',
    text: 'const legacy = unscopedVaultServiceFor(slot);\n',
    defines: false,
    uses: 1
  },
  {
    name: 'a comment naming it',
    text: '// unscopedVaultServiceFor(slot) is never called here.\nconst b = 1;\n',
    defines: false,
    uses: 0
  }
];
for (const f of SCOPE_FIXTURES) {
  const got = unscopedComposerUses(f.text);
  if (got.defines === f.defines && got.uses === f.uses) behaved += 1;
  else failures.push(`${TAG} the composer scanner misread the fixture "${f.name}"`);
}
const PROOF_FIXTURES = [
  {
    name: 'the shipping call',
    text: 'migration = migrateUnscopedVault({\n  runner: r,\n  vault: v,\n  slots: [],\n  ownProfile: ownProfileVerdict({ userData: a, env: process.env })\n});\n',
    calls: 1,
    proved: true
  },
  {
    name: 'the proof replaced by a constant',
    text: 'migration = migrateUnscopedVault({\n  runner: r,\n  ownProfile: true\n});\n',
    calls: 1,
    proved: false
  },
  {
    name: 'the proof elsewhere in the file but not in the call',
    text: 'const own = ownProfileVerdict({ env });\nmigration = migrateUnscopedVault({\n  runner: r,\n  ownProfile: own\n});\n',
    calls: 1,
    proved: false
  },
  {
    name: 'no call at all',
    text: 'const x = 1;\n',
    calls: 0,
    proved: false
  }
];
for (const f of PROOF_FIXTURES) {
  const got = migrationCarriesTheProof(f.text);
  if (got.calls === f.calls && got.proved === f.proved) behaved += 1;
  else failures.push(`${TAG} the proof scanner misread the fixture "${f.name}"`);
}
// PHASE 211. The default-store reachability scanner, proved on fixtures.
const DEFAULT_FIXTURES = [
  {
    name: 'the shipping definition',
    text: 'export async function defaultStoreTarget(d, p) {\n  return null;\n}\n',
    defines: true,
    calls: 0
  },
  {
    name: 'the one caller',
    text: 'const defTarget = await defaultStoreTarget(d.stores, provider);\n',
    defines: false,
    calls: 1
  },
  {
    name: 'a second caller sneaking in',
    text: 'await defaultStoreTarget(a, b);\nawait defaultStoreTarget(c, d);\n',
    defines: false,
    calls: 2
  },
  {
    name: 'a comment naming it',
    text: '// defaultStoreTarget(d, p) is the only writer of the default store.\nconst x = 1;\n',
    defines: false,
    calls: 0
  }
];
for (const f of DEFAULT_FIXTURES) {
  const got = defaultTargetUses(f.text);
  if (got.defines === f.defines && got.calls === f.calls) behaved += 1;
  else failures.push(`${TAG} the default-store scanner misread the fixture "${f.name}"`);
}
notes.push(
  `${String(behaved)} of ${String(FIXTURES.length + REFUSAL_FIXTURES.length + SCOPE_FIXTURES.length + PROOF_FIXTURES.length + DEFAULT_FIXTURES.length)} scanner fixtures behaved`
);

// ---------------------------------------------------------------------------
// Rule 20b (Phase 281). EVERY VENDOR KEYCHAIN CALL SITE, AND WHERE ITS ACCOUNT
// CAME FROM.
//
// Claude Code names its keychain item by service AND account, and research
// 126 §2.4 found every call in this domain naming the service alone, so on the
// operator's machine the observe, the backstop and both write targets reached
// a stray under another account first. The driven half of rule 20 is the
// probe's `vendorAddress`, `vendorRefusal` and `vendorCommit` readings. This is
// the half a probe cannot give: a NEW call site the probe never drives, and an
// account that happens to equal the vendor's in every world the probe builds
// while coming from somewhere else, being a literal, the account read back off
// an item, or a reading's `account` field.
//
// So every call of the six `security.ts` functions in the domain is found, the
// number of them aimed at a vendor name is pinned, and each one's account
// argument is followed back to its binding: it must be a name destructured
// from `claudeStoreAddress(...)` in the same function and never assigned
// again, or a parameter every caller in the same file fills that way. And
// `claudeStoreAddress` itself must take the account from `claudeKeychainAccount`
// over the seam's environment. Tortie's own vault names live in `vault.ts` and
// `migrate.ts`, pass `null`, and since Phase 304 are only ever READ and
// deleted: a `keychainWrite` from either file is a finding on its own, because
// Tortie's own store is a sealed file and the keychain is read once for a
// legacy item (rule 22). They are counted apart. A file other than
// `security.ts` naming a `security` verb as a string is running the program
// itself around the refusal, and is a finding too.
//
// IT IS TEXT AND NOT A TYPE CHECKER. It reads top level function declarations
// whose closing brace sits at the start of a line, which is every function the
// domain declares under the repository's formatter, and it follows a parameter
// one caller deep. A binding it cannot follow is a finding rather than a pass,
// so a later shape it does not understand fails closed and says which site.
// ---------------------------------------------------------------------------

/** The domain's own names, which are not the vendor's and pass no account. */
const OWN_NAME_FILES = new Set(['vault.ts', 'migrate.ts']);

/**
 * THE PINNED COUNT. `stores.ts` holds seven, being `safeKeychain`'s read,
 * `keychainTarget`'s write, read, staged read and discard, and `forgetStore`'s
 * two deletes, and `watch.ts` holds the fingerprint's two attribute reads. A
 * commit that adds or removes one moves this number in the same commit and
 * says why in its body.
 */
const VENDOR_KEYCHAIN_SITES = 9;

/**
 * The names in one parameter list, split at the commas that sit at depth zero.
 * Angle brackets count as depth here and nowhere else, because a parameter typed
 * `Pick<StoreDeps, 'env' | 'userName'>` holds a comma that is not a split.
 */
function parameterNames(code, open) {
  const close = closeOf(code, open);
  const text = close < 0 ? '' : code.slice(open + 1, close);
  const names = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '=' && text[i + 1] === '>') {
      current += '=>';
      i += 1;
      continue;
    }
    if ('([{<'.includes(c)) depth += 1;
    else if (')]}>'.includes(c)) depth -= 1;
    if (c === ',' && depth === 0) {
      names.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  if (current.trim() !== '') names.push(current);
  return names.map((n) => n.trim().replace(/^\.\.\./, '').split(/[?:=]/)[0].trim());
}

/** Every top level function declaration, with its parameter names and span. */
function topLevelFunctions(code) {
  const out = [];
  const declared = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
  let m;
  while ((m = declared.exec(code)) !== null) {
    const open = m.index + m[0].length - 1;
    const params = parameterNames(code, open);
    const end = code.indexOf('\n}', open);
    out.push({ name: m[1], params, start: m.index, end: end < 0 ? code.length : end });
  }
  return out;
}

/**
 * Where the account at one call came from: `null` when it is the vendor rule's,
 * or a sentence naming what it is instead.
 */
function accountProvenance(code, fns, at, arg, depth) {
  if (!/^[A-Za-z_$][\w$]*$/.test(arg)) {
    return `the account is \`${arg}\` rather than a name bound from claudeStoreAddress`;
  }
  const fn = fns.find((f) => f.start <= at && at < f.end);
  if (fn === undefined) return `the account \`${arg}\` is not inside a function this rule can read`;
  const body = code.slice(fn.start, fn.end);
  // AN ASSIGNMENT, and a declaration is not one: `const own = existing ?? x`
  // is a name bound from something else, which the question below answers.
  const signature = body.match(/^[^(]*\([^)]*\)/)?.[0].length ?? 0;
  const assigned = new RegExp(`\\b${arg}\\s*(?:=(?![=>])|\\?\\?=|\\|\\|=)`, 'g');
  let a;
  while ((a = assigned.exec(body)) !== null) {
    if (a.index < signature) continue;
    const before = body.slice(0, a.index);
    if (/\.\s*$/.test(before) || /\b(?:const|let|var)\s+$/.test(before)) continue;
    return `the account \`${arg}\` in ${fn.name} is assigned again after it is bound`;
  }
  const destructured = new RegExp(
    `\\b(?:const|let)\\s*\\{[^}]*\\b${arg}\\b[^}]*\\}\\s*=\\s*claudeStoreAddress\\s*\\(`
  );
  if (destructured.test(body)) return null;
  const position = fn.params.indexOf(arg);
  if (position < 0) {
    return `the account \`${arg}\` in ${fn.name} is not destructured from claudeStoreAddress`;
  }
  if (depth >= 2) return `the account \`${arg}\` in ${fn.name} is passed down further than this rule follows`;
  const callers = [];
  const call = new RegExp(`\\b${fn.name}\\s*\\(`, 'g');
  let m;
  while ((m = call.exec(code)) !== null) {
    if (/function\s+$/.test(code.slice(Math.max(0, m.index - 24), m.index))) continue;
    callers.push(m.index);
  }
  if (callers.length === 0) return `${fn.name} takes the account \`${arg}\` and nothing in the file calls it`;
  for (const callAt of callers) {
    const given = callArguments(code, code.indexOf('(', callAt))[position] ?? '';
    const why = accountProvenance(code, fns, callAt, given, depth + 1);
    if (why !== null) return `${fn.name}'s caller: ${why}`;
  }
  return null;
}

/** Rule 20b over one file's text. */
function vendorKeychainSitesIn(name, text) {
  const code = blankComments(text);
  const fns = topLevelFunctions(code);
  const sites = [];
  const bad = [];
  const own = [];
  const bypass = [];
  if (name !== 'security.ts') {
    for (const verb of ['find-generic-password', 'delete-generic-password', 'add-generic-password']) {
      if (new RegExp(`['"\`]${verb}\\b`).test(code)) bypass.push(`${name} runs ${verb} itself`);
    }
  }
  const called = /\bkeychain(?:Read|Account|Modified|HasItem|Delete|Write)\s*\(/g;
  let m;
  while ((m = called.exec(code)) !== null) {
    if (/function\s+$/.test(code.slice(Math.max(0, m.index - 24), m.index))) continue;
    const verb = m[0].replace(/\s*\($/, '');
    const args = callArguments(code, m.index + m[0].length - 1);
    const account = args[2] ?? '';
    const fn = fns.find((f) => f.start <= m.index && m.index < f.end);
    const where = `${name}:${fn?.name ?? '(top level)'}:${verb}`;
    if (OWN_NAME_FILES.has(name)) {
      own.push(where);
      // PHASE 304. Tortie's own store writes NO keychain item: the vault is a
      // sealed file and the keychain is read once for a legacy item, so a
      // write from either own-name file is the parent's shape coming back.
      if (verb === 'keychainWrite') {
        bad.push(`${where} WRITES A KEYCHAIN ITEM from Tortie's own store, which since Phase 304 is a sealed file the keychain is only ever read for`);
        continue;
      }
      if (account !== 'null') bad.push(`${where} passes \`${account}\` where Tortie's own names pass null`);
      continue;
    }
    sites.push(where);
    const why = accountProvenance(code, fns, m.index, account, 0);
    if (why !== null) bad.push(`${where}: ${why}`);
  }
  let addressRule = null;
  const address = fns.find((f) => f.name === 'claudeStoreAddress');
  if (address !== undefined) {
    const body = code.slice(address.start, address.end);
    addressRule =
      /\baccount:\s*claudeKeychainAccount\s*\(\s*d\.env\s*,/.test(body) &&
      /\bservice:\s*claudeKeychainService\s*\(\s*d\.env\s*,/.test(body);
  }
  return { sites, bad, own, bypass, addressRule };
}

/** Rule 20b over a whole domain directory, as one comparable reading. */
function vendorKeychainSites(dir) {
  const sites = [];
  const bad = [];
  const bypass = [];
  let own = 0;
  let addressRule = false;
  let addressDefined = 0;
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts')).sort()) {
    const got = vendorKeychainSitesIn(name, readFileSync(join(dir, name), 'utf8'));
    sites.push(...got.sites);
    bad.push(...got.bad);
    bypass.push(...got.bypass);
    own += got.own.length;
    if (got.addressRule !== null) {
      addressDefined += 1;
      addressRule = got.addressRule;
    }
  }
  return {
    sites: sites.sort(),
    bad: bad.sort(),
    bypass: bypass.sort(),
    own,
    addressRule: addressDefined === 1 && addressRule
  };
}

/**
 * RULE 21 (a) to (c) over one copy of the domain, as one comparable reading.
 *
 * It is read from the source rather than driven because two of the three
 * clauses are about ORDER — the refusal ahead of the call count and ahead of the
 * spawn — and no world this gate builds can tell a line counted before it was
 * refused from one counted after. The reading is taken over every ablated copy
 * as well, the way `vendorKeychainSites` is, so an ablation of the comparison
 * moves it even where the probe cannot see the difference.
 */
function lineCapSites(dir) {
  let capValue = null;
  const declaredIn = [];
  const oldName = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts')).sort()) {
    const code = stripComments(readFileSync(join(dir, name), 'utf8'));
    const declared = /export const SECURITY_LINE_MAX_BYTES\s*=\s*([0-9_]+)/.exec(code);
    if (declared !== null) {
      declaredIn.push(name);
      capValue = Number((declared[1] ?? '').replace(/_/g, ''));
    }
    // THE OLD NAME IS GONE WITH NO ALIAS, so a `.length` comparison against it
    // cannot survive anywhere. `SECURITY_LINE_MAX_BYTES` is not it.
    if (/\bSECURITY_LINE_MAX\b(?!_BYTES)/.test(code)) oldName.push(name);
  }
  if (!existsSync(join(dir, 'security.ts'))) {
    // A DOMAIN WITH NO security.ts, read as a reading rather than as a stack,
    // for the reason rule 17 records: a gate that dies is not a gate that fails.
    return { declaredIn, capValue, oldName, absent: true };
  }
  const code = stripComments(readFileSync(join(dir, 'security.ts'), 'utf8'));
  const fitsBody = functionBodyOf(code, 'securityLineFits') ?? '';
  const writeBody = functionBodyOf(code, 'keychainWrite') ?? '';
  const runnerBody = functionBodyOf(code, 'defaultSecurityRunner') ?? '';
  const asks = (body) => body.indexOf('securityLineFits(');
  const writeAsks = asks(writeBody);
  const writeSends = writeBody.indexOf("runner.run(['-i']");
  const runnerAsks = asks(runnerBody);
  return {
    declaredIn,
    capValue,
    oldName,
    // (b) ONE COMPARISON, AND IT COUNTS BYTES.
    fitsNamesBytes: /Buffer\.byteLength\s*\(/.test(fitsBody),
    fitsNamesTheCap: /\bSECURITY_LINE_MAX_BYTES\b/.test(fitsBody),
    fitsNamesLength: /\.length\b/.test(fitsBody),
    // Counted INSIDE security.ts alone: the phase's own tests name it too, and a
    // count over `src/` would be red the moment they exist.
    capMentions: (code.match(/\bSECURITY_LINE_MAX_BYTES\b/g) ?? []).length,
    // (c) The refusal is ahead of the one `-i` send and ahead of the count.
    iTokens: (code.match(/'-i'/g) ?? []).length,
    writeSends: (writeBody.match(/runner\.run\(\['-i'\]/g) ?? []).length,
    writeAsksFirst: writeAsks >= 0 && writeSends >= 0 && writeAsks < writeSends,
    runnerAsksBeforeCount:
      runnerAsks >= 0 &&
      runnerBody.indexOf('calls += 1') > runnerAsks &&
      runnerBody.indexOf('runGuarded(') > runnerAsks
  };
}

/**
 * RULE 22's scanned half over one copy of the domain, as one comparable
 * reading (Phase 304).
 *
 * Tortie's own store is a sealed file and the keychain is only ever READ for
 * it, so `vault.ts` may name neither `keychainWrite` nor the `-i` token, and
 * `keychainWrite` may have exactly one caller outside its own file in the
 * domain, being the vendor's own item in `stores.ts`. A second caller is a
 * second way to compose a line `security -i` would cut, which is the ceiling
 * this phase removed from Tortie's own store. Read over every ablated copy as
 * well, the way `lineCapSites` is, so a write put back into the vault moves
 * this reading even where the probe's world cannot see the difference.
 */
function sealedSites(dir) {
  if (!existsSync(join(dir, 'vault.ts'))) return { absent: true };
  const vaultCode = stripComments(readFileSync(join(dir, 'vault.ts'), 'utf8'));
  const writers = [];
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.ts')).sort()) {
    if (name === 'security.ts') continue;
    const code = stripComments(readFileSync(join(dir, name), 'utf8'));
    const calls = (code.match(/\bkeychainWrite\s*\(/g) ?? []).length;
    if (calls > 0) writers.push(`${name}:${String(calls)}`);
  }
  return {
    vaultNamesWrite: /\bkeychainWrite\b/.test(vaultCode),
    vaultNamesI: /'-i'/.test(vaultCode),
    writers
  };
}

// The scanner, proved on fixtures before it is believed. The first is the
// shipping shape and must pass; every other one is a way the account stops
// being the vendor rule's, and each must be caught.
const SITE_FIXTURES = [
  {
    name: 'the shipping shape, a parameter one caller deep',
    file: 'stores.ts',
    text:
      'async function safeKeychain(d, service, account) {\n  return await keychainRead(d.runner, service, account);\n}\n' +
      'export async function readStore(d, provider, dir) {\n  const { service, account } = claudeStoreAddress(d, dir);\n  const found = await safeKeychain(d, service, account);\n}\n',
    sites: 1,
    bad: 0,
    bypass: 0
  },
  {
    name: 'a literal account',
    file: 'stores.ts',
    text: "export async function forgetStore(d, provider, dir) {\n  await keychainDelete(d.runner, claudeWriteService(dir), 'p281-stray');\n}\n",
    sites: 1,
    bad: 1,
    bypass: 0
  },
  {
    name: 'no account at all',
    file: 'watch.ts',
    text: 'export async function defaultKeychainFingerprint(keep) {\n  const { service } = claudeStoreAddress(keep.stores, null);\n  return keychainModified(keep.stores.runner, service, null);\n}\n',
    sites: 1,
    bad: 1,
    bypass: 0
  },
  {
    name: 'the account copied off the item the name matched',
    file: 'stores.ts',
    text:
      'function keychainTarget(d, service, account) {\n  return { read: () => keychainRead(d.runner, service, account) };\n}\n' +
      'export async function storeTarget(d, provider, dir) {\n  const service = claudeWriteService(dir);\n  const existing = await keychainAccount(d.runner, service, null);\n  return keychainTarget(d, service, existing ?? d.userName);\n}\n',
    sites: 2,
    bad: 2,
    bypass: 0
  },
  {
    name: "a reading's account field",
    file: 'stores.ts',
    text: 'export async function forgetStore(d, provider, dir) {\n  const reading = await readStore(d, provider, dir);\n  await keychainDelete(d.runner, claudeWriteService(dir), reading.account);\n}\n',
    sites: 1,
    bad: 1,
    bypass: 0
  },
  {
    name: 'the vendor account bound and then assigned over',
    file: 'stores.ts',
    text: 'export async function forgetStore(d, provider, dir) {\n  let { account } = claudeStoreAddress(d, dir);\n  account = d.userName;\n  await keychainDelete(d.runner, claudeWriteService(dir), account);\n}\n',
    sites: 1,
    bad: 1,
    bypass: 0
  },
  {
    name: 'security run by hand around the refusal',
    file: 'watch.ts',
    text: "export async function defaultKeychainFingerprint(keep) {\n  return (await keep.stores.runner.run(['find-generic-password', '-s', 'x'])).stdout;\n}\n",
    sites: 0,
    bad: 0,
    bypass: 1
  },
  {
    name: "Tortie's own legacy name, read and deleted with null",
    file: 'vault.ts',
    text: 'export function legacyKeychainVault(runner, scope) {\n  return { get: (slot) => keychainRead(runner, serviceFor(slot), null), del: (slot) => keychainDelete(runner, serviceFor(slot), null) };\n}\n',
    sites: 0,
    bad: 0,
    bypass: 0
  },
  {
    // PHASE 304. The parent's keychain backend, which WROTE Tortie's own item.
    name: "Tortie's own store writing a keychain item, which Phase 304 removed",
    file: 'vault.ts',
    text: "export function keychainVault(runner, scope) {\n  return { put: async (slot, payload) => { await keychainWrite(runner, serviceFor(slot), 'tortie', payload); } };\n}\n",
    sites: 0,
    bad: 1,
    bypass: 0
  },
  {
    name: 'a comment naming a service-only call',
    file: 'stores.ts',
    text: '// keychainRead(d.runner, service, null) was the parent.\nexport const X = 1;\n',
    sites: 0,
    bad: 0,
    bypass: 0
  }
];
let siteFixturesBehaved = 0;
for (const f of SITE_FIXTURES) {
  const got = vendorKeychainSitesIn(f.file, f.text);
  if (got.sites.length === f.sites && got.bad.length === f.bad && got.bypass.length === f.bypass) {
    siteFixturesBehaved += 1;
  } else {
    failures.push(
      `${TAG} the vendor call site scanner misread the fixture "${f.name}": ${JSON.stringify({ sites: got.sites.length, bad: got.bad, bypass: got.bypass })}`
    );
  }
}

const liveSites = vendorKeychainSites(DOMAIN);
check(
  liveSites.sites.length === VENDOR_KEYCHAIN_SITES,
  `${TAG} THE CREDENTIALS DOMAIN HAS ${String(liveSites.sites.length)} VENDOR KEYCHAIN CALL SITES rather than the ${String(VENDOR_KEYCHAIN_SITES)} this gate pins, so a call was added or removed without anyone deciding its account: ${liveSites.sites.join(', ')}`
);
for (const why of liveSites.bad) {
  failures.push(`${TAG} A VENDOR KEYCHAIN CALL DOES NOT PASS THE VENDOR ACCOUNT: ${why}`);
}
for (const why of liveSites.bypass) {
  failures.push(`${TAG} THE REFUSAL IS WALKED AROUND: ${why}, so a lookup by service alone reaches the first item of that name`);
}
check(
  liveSites.addressRule,
  `${TAG} claudeStoreAddress does not take its account from claudeKeychainAccount and its service from claudeKeychainService over the seam's environment, or it is defined other than once`
);
notes.push(
  `${String(liveSites.sites.length)} vendor keychain call sites each passing the vendor rule's account, ${String(liveSites.own)} of Tortie's own, ${String(siteFixturesBehaved)} of ${String(SITE_FIXTURES.length)} call site fixtures behaved`
);

// ---------------------------------------------------------------------------
// RULE 21 (Phase 287), the scanned half. THE MEASURED BUFFER IS 4,096 BYTES,
// newline included (build/p287/SPEC.md §1, four runs on a scratch keychain under
// a scratch `HOME` where no default keychain resolves, and the attacker's own
// three line shapes agreed with them exactly). The cap is that number less a
// stated margin, and it is compared in BYTES because the buffer counts bytes.
// ---------------------------------------------------------------------------

/** Every `.ts` file under `dir`, tests aside, because a test names what it pins. */
function sourceFilesBelow(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...sourceFilesBelow(full));
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

const liveLineCap = lineCapSites(DOMAIN);
// (a) ONE DECLARATION, AT OR UNDER THE MEASURED BUFFER LESS ITS MARGIN.
const MEASURED_SECURITY_BUFFER_BYTES = 4_096;
const STATED_MARGIN_BYTES = 96;
check(
  liveLineCap.declaredIn.length === 1 && liveLineCap.declaredIn[0] === 'security.ts',
  `${TAG} SECURITY_LINE_MAX_BYTES is declared in ${liveLineCap.declaredIn.join(', ') || 'no file'} rather than in security.ts alone, so there is more than one cap or none`
);
check(
  liveLineCap.capValue !== null &&
    liveLineCap.capValue <= MEASURED_SECURITY_BUFFER_BYTES - STATED_MARGIN_BYTES,
  `${TAG} THE CAP IS ${String(liveLineCap.capValue)} BYTES, past the measured buffer of ${String(MEASURED_SECURITY_BUFFER_BYTES)} less its stated margin of ${String(STATED_MARGIN_BYTES)}: a line that long is cut by security -i, loses the keychain path off its end and hangs (build/p287/SPEC.md §1)`
);
check(
  liveLineCap.oldName.length === 0,
  `${TAG} ${liveLineCap.oldName.join(', ')} still names SECURITY_LINE_MAX, the cap Phase 281.1 compared in UTF-16 units, which a non-ASCII keychain path walks past`
);
{
  const survivors = sourceFilesBelow(join(repoRoot, 'src'))
    .filter((file) => /\bSECURITY_LINE_MAX\b(?!_BYTES)/.test(stripComments(readFileSync(file, 'utf8'))))
    .map((file) => file.slice(repoRoot.length + 1));
  check(
    survivors.length === 0,
    `${TAG} ${survivors.join(', ')} compares against SECURITY_LINE_MAX, which this phase removed with no alias precisely so a comparison in UTF-16 units cannot survive`
  );
}
// (b) ONE COMPARISON, AND IT COUNTS BYTES.
check(
  liveLineCap.fitsNamesBytes && liveLineCap.fitsNamesTheCap && !liveLineCap.fitsNamesLength,
  `${TAG} securityLineFits does not compare Buffer.byteLength against SECURITY_LINE_MAX_BYTES, or it reads a .length: the buffer counts BYTES, and a 4,106 byte line of exactly 4,096 characters was measured hanging`
);
check(
  liveLineCap.capMentions === 2,
  `${TAG} SECURITY_LINE_MAX_BYTES appears ${String(liveLineCap.capMentions)} times in security.ts's code rather than twice, being its declaration and the one comparison, so some other site compares against it`
);
// (c) THE PROGRAM IS NAMED IN THREE FILES, AND THE `-i` TOKEN IN ONE.
{
  const naming = sourceFilesBelow(join(repoRoot, 'src/main'))
    .filter((file) => {
      const code = stripComments(readFileSync(file, 'utf8'));
      return code.includes('/usr/bin/security') || /\bSECURITY_BIN\b/.test(code);
    })
    .map((file) => file.slice(repoRoot.length + 1))
    .sort();
  const EXPECTED_SECURITY_FILES = [
    'src/main/credentials/security.ts',
    'src/main/usage/credentials.ts',
    'src/main/usage/login-accounts.ts'
  ];
  check(
    JSON.stringify(naming) === JSON.stringify(EXPECTED_SECURITY_FILES),
    `${TAG} ${naming.join(', ')} name the security program rather than the three this gate pins, so a fourth way to reach it exists and rule 21's refusal does not cover it`
  );
  const sendsI = naming.filter((name) =>
    /'-i'/.test(stripComments(readFileSync(join(repoRoot, name), 'utf8')))
  );
  check(
    sendsI.length === 1 && sendsI[0] === 'src/main/credentials/security.ts',
    `${TAG} the -i token appears in ${sendsI.join(', ') || 'no file'} rather than in security.ts alone, so a line reaches security -i somewhere the cap is not asked`
  );
}
check(
  liveLineCap.iTokens === 3 && liveLineCap.writeSends === 1 && liveLineCap.writeAsksFirst,
  `${TAG} keychainWrite sends ${String(liveLineCap.writeSends)} -i line(s) and ${liveLineCap.writeAsksFirst ? 'asks' : 'DOES NOT ASK'} securityLineFits before it (security.ts holds ${String(liveLineCap.iTokens)} -i tokens)`
);
check(
  liveLineCap.runnerAsksBeforeCount,
  `${TAG} defaultSecurityRunner does not ask securityLineFits BEFORE it counts the call and before runGuarded, so a line it refuses is counted as a call security never ran, or worse is spawned`
);
notes.push(
  `the security line cap is ${String(liveLineCap.capValue)} bytes, declared once, compared once in bytes, with the program named in 3 files and -i in 1`
);

// ---------------------------------------------------------------------------
// RULE 22 (Phase 304), the scanned half. TORTIE'S OWN STORE WRITES NO KEYCHAIN
// ITEM. The ceiling Phase 287 measured belongs to `security -i`, and Tortie's
// own store had it only because its macOS backend was a keychain item; a
// sealed file has none. So the vault must not be able to compose the line at
// all, and the one write that still can is the vendor's own item.
// ---------------------------------------------------------------------------

const liveSealed = sealedSites(DOMAIN);
check(
  liveSealed.absent !== true,
  `${TAG} RULE 22 CANNOT RUN: the domain has no vault.ts`
);
if (liveSealed.absent !== true) {
  check(
    !liveSealed.vaultNamesWrite,
    `${TAG} vault.ts names keychainWrite, so Tortie's own store can compose a security -i line again and inherits the 4,096 byte ceiling this phase removed from it`
  );
  check(
    !liveSealed.vaultNamesI,
    `${TAG} vault.ts names the -i token, so a line reaches security -i from Tortie's own store`
  );
  check(
    JSON.stringify(liveSealed.writers) === JSON.stringify(['stores.ts:1']),
    `${TAG} keychainWrite is called from ${liveSealed.writers.join(', ') || 'no file'} rather than once from stores.ts alone, so a second way to compose a line security would cut exists in the domain`
  );
  notes.push("Tortie's own store names no keychain write and keychainWrite has 1 caller outside security.ts");
}

// ---------------------------------------------------------------------------
// RULE 23 (Phase 314), the scanned half. THE APPLE PUSH PROVIDER KEY IS KEPT IN
// ONE SEALED SLOT, THROUGH THE ONE WRITE, AND READ BACK ONLY THROUGH THE SEAL.
// ---------------------------------------------------------------------------

/**
 * Rule 23's reading of one `apns-key.ts`, as one comparable value. Read over
 * the tree and over every ablated copy, the way `lineCapSites` is, so an
 * ablation of the module moves this reading even where the probe's world could
 * not tell.
 */
function apnsSitesOf(text) {
  const code = stripComments(text);
  return {
    namesKeychain: /keychain/i.test(code),
    namesSecurity: /security/i.test(code),
    namesLegacy: /\blegacyKeychainVault\b/.test(code),
    namesRunner: /\bdefaultSecurityRunner\b/.test(code),
    namesI: /['"`]-i['"`]/.test(code),
    sealedBackends: (code.match(/\bsealedVault\(dir, seal, NO_LEGACY\)/g) ?? []).length,
    anyBackends: (code.match(/\bsealedVault\s*\(/g) ?? []).length,
    swapWrites: (code.match(/\bsafeSwap\(vaultTarget\(backend, APNS_KEY_SLOT\), payload\)/g) ?? []).length,
    anySwaps: (code.match(/\bsafeSwap\s*\(/g) ?? []).length,
    gets: (code.match(/\bawait backend\.get\(APNS_KEY_SLOT\)/g) ?? []).length,
    fileTouches: (
      code.match(
        /\b(?:readFileSync|readFile|readTextNoFollowSync|writeFileSync|writeFile|writeNoFollowSync|renameSync|renameNoFollowSync|appendFileSync|createWriteStream|createReadStream|openSync)\s*\(|node:fs|backend\.put\s*\(|\.commit\s*\(/g
      ) ?? []
    ).length
  };
}

function apnsSites(dir) {
  const path = join(dir, 'apns-key.ts');
  if (!existsSync(path)) return { absent: true };
  return apnsSitesOf(readFileSync(path, 'utf8'));
}

/** Is one reading the shape rule 23 asks for? */
function apnsReadingHolds(r) {
  return (
    r.absent !== true &&
    !r.namesKeychain &&
    !r.namesSecurity &&
    !r.namesLegacy &&
    !r.namesRunner &&
    !r.namesI &&
    r.sealedBackends === 1 &&
    r.anyBackends === 1 &&
    r.swapWrites === 1 &&
    r.anySwaps === 1 &&
    r.gets === 1 &&
    r.fileTouches === 0
  );
}

/**
 * Every module-specifier a file names and how: `type` for `import type` and
 * `export type`, `value` for everything else, a bare import and a dynamic one
 * included, because either loads the module.
 */
function specifiersOf(text) {
  const code = stripComments(text);
  const out = [];
  for (const m of code.matchAll(/\b(import|export)\s+(type\s+)?[^;'"]*?\bfrom\s*['"]([^'"]+)['"]/g)) {
    out.push({ spec: m[3], kind: m[2] === undefined ? 'value' : 'type' });
  }
  for (const m of code.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) out.push({ spec: m[1], kind: 'value' });
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) out.push({ spec: m[1], kind: 'value' });
  return out;
}

const APNS_SPEC = /(?:^|\/)apns-key(?:\.[cm]?[jt]s)?$/;

// The scanners, proved on fixtures before they are believed. The first is the
// shipping shape; every other one is a way the key stops being sealed, or a way
// a module reaches it that the rule refuses.
const APNS_SITE_FIXTURES = [
  {
    name: 'the shipping shape',
    text:
      "import { safeSwap } from './swap';\n" +
      "import { NO_LEGACY, sealedVault, vaultTarget } from './vault';\n" +
      'export function apnsKeyStore(dir, seal) {\n' +
      '  const backend = sealedVault(dir, seal, NO_LEGACY);\n' +
      '  async function keep(payload) {\n' +
      '    const written = await safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload);\n' +
      '  }\n' +
      '  async function opened() {\n' +
      '    const text = await backend.get(APNS_KEY_SLOT);\n' +
      '  }\n' +
      '}\n',
    holds: true
  },
  {
    name: 'the seal dropped',
    text:
      '  const backend = sealedVault(dir, { wrap: (t) => t, open: (b) => b }, NO_LEGACY);\n' +
      '    const written = await safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload);\n' +
      '    const text = await backend.get(APNS_KEY_SLOT);\n',
    holds: false
  },
  {
    name: 'a legacy keychain arm handed in',
    text:
      '  const backend = sealedVault(dir, seal, legacyKeychainVault(defaultSecurityRunner(), dir));\n' +
      '    const written = await safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload);\n' +
      '    const text = await backend.get(APNS_KEY_SLOT);\n',
    holds: false
  },
  {
    name: 'the file read past the seal',
    text:
      '  const backend = sealedVault(dir, seal, NO_LEGACY);\n' +
      '    const written = await safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload);\n' +
      "    const text = readFileSync(join(dir, 'apns-provider.cred'), 'utf8');\n",
    holds: false
  },
  {
    name: 'a second write beside the one write',
    text:
      '  const backend = sealedVault(dir, seal, NO_LEGACY);\n' +
      '    const written = await safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload);\n' +
      '    await backend.put(APNS_KEY_SLOT, payload);\n' +
      '    const text = await backend.get(APNS_KEY_SLOT);\n',
    holds: false
  },
  {
    name: 'a sentence about the keychain in a comment only',
    text:
      '// the keychain and security are never reached from here\n' +
      '  const backend = sealedVault(dir, seal, NO_LEGACY);\n' +
      '    const written = await safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload);\n' +
      '    const text = await backend.get(APNS_KEY_SLOT);\n',
    holds: true
  }
];
const SPECIFIER_FIXTURES = [
  { text: "import type { ApnsProviderKey } from '../credentials/apns-key';", want: 'type' },
  { text: "export type { ApnsProviderKey } from '../credentials/apns-key';", want: 'type' },
  { text: "import { apnsKeyStore } from '../credentials/apns-key';", want: 'value' },
  { text: "import { type ApnsProviderKey, apnsKeyStore } from '../credentials/apns-key.js';", want: 'value' },
  { text: "import '../credentials/apns-key';", want: 'value' },
  { text: "const m = await import('../credentials/apns-key');", want: 'value' }
];
{
  let behaved = 0;
  for (const f of APNS_SITE_FIXTURES) {
    if (apnsReadingHolds(apnsSitesOf(f.text)) === f.holds) behaved += 1;
    else failures.push(`${TAG} rule 23's scanner misread its fixture "${f.name}"`);
  }
  for (const f of SPECIFIER_FIXTURES) {
    const found = specifiersOf(f.text).filter((x) => APNS_SPEC.test(x.spec));
    if (found.length === 1 && found[0].kind === f.want) behaved += 1;
    else failures.push(`${TAG} rule 23's importer reader misread ${JSON.stringify(f.text)}`);
  }
  notes.push(`${String(behaved)} of ${String(APNS_SITE_FIXTURES.length + SPECIFIER_FIXTURES.length)} rule 23 fixtures behaved`);
}

const liveApns = apnsSites(DOMAIN);
check(
  liveApns.absent !== true,
  `${TAG} RULE 23 CANNOT RUN: the domain has no apns-key.ts, so the Apple push provider key has no sealed store`
);
if (liveApns.absent !== true) {
  check(
    !liveApns.namesKeychain && !liveApns.namesSecurity && !liveApns.namesLegacy && !liveApns.namesRunner && !liveApns.namesI,
    `${TAG} apns-key.ts names ${[
      liveApns.namesKeychain ? 'a keychain' : '',
      liveApns.namesSecurity ? 'security' : '',
      liveApns.namesLegacy ? 'legacyKeychainVault' : '',
      liveApns.namesRunner ? 'defaultSecurityRunner' : '',
      liveApns.namesI ? 'the -i token' : ''
    ]
      .filter(Boolean)
      .join(', ')} in its code. The provider key is a sealed file and nothing in its store may reach a keychain.`
  );
  check(
    liveApns.sealedBackends === 1 && liveApns.anyBackends === 1,
    `${TAG} apns-key.ts builds ${String(liveApns.anyBackends)} sealed vault(s), ${String(liveApns.sealedBackends)} of them sealedVault(dir, seal, NO_LEGACY). There is one, over the seal it was handed and no legacy arm.`
  );
  check(
    liveApns.swapWrites === 1 && liveApns.anySwaps === 1,
    `${TAG} apns-key.ts writes through ${String(liveApns.anySwaps)} safeSwap call(s), ${String(liveApns.swapWrites)} of them safeSwap(vaultTarget(backend, APNS_KEY_SLOT), payload). The key is written by the one write and nothing else.`
  );
  check(
    liveApns.gets === 1 && liveApns.fileTouches === 0,
    `${TAG} apns-key.ts reads its slot ${String(liveApns.gets)} time(s) through backend.get and touches a file itself ${String(liveApns.fileTouches)} time(s). A key read past the seal answers a plaintext file an agent planted.`
  );
}
{
  const srcRoot = join(repoRoot, 'src');
  const sources = sourceFilesBelow(srcRoot).filter((f) => !/\.test\.tsx?$/.test(f));
  const relOf = (f) => f.slice(repoRoot.length + 1);
  const ALLOWED_VALUE = new Set(['src/main/credentials/index.ts', 'src/main/harness/push-seam.ts']);
  let importers = 0;
  for (const file of sources) {
    const rel = relOf(file);
    const text = readFileSync(file, 'utf8');
    if (/^src\/(?:renderer|preload|shared)\//.test(rel)) {
      check(
        !/apns-key|APNS_KEY_SLOT|apnsKeyStore/.test(stripComments(text)),
        `${TAG} ${rel} names the Apple push key store. Nothing the renderer, the preload or the shared contract can reach may name where the key is kept.`
      );
    }
    for (const { spec, kind } of specifiersOf(text).filter((x) => APNS_SPEC.test(x.spec))) {
      importers += 1;
      if (ALLOWED_VALUE.has(rel)) continue;
      if (rel.startsWith('src/main/push/')) {
        check(
          kind === 'type',
          `${TAG} ${rel} imports ${spec} as a VALUE. The sender names the key's types and is handed the key; it never opens the store itself.`
        );
        continue;
      }
      failures.push(
        `${TAG} ${rel} imports ${spec}. Its only importers are src/main/credentials/index.ts, src/main/harness/push-seam.ts and src/main/push/ by import type.`
      );
    }
  }
  notes.push(
    `apns-key.ts is one sealed vault with no legacy arm, one write through the one write, one read through the seal and no file of its own; ${String(importers)} importer(s) in src/, none under the renderer, the preload or shared`
  );
}

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
  'evidence',
  'locks',
  'claudeLock',
  'lockRefusal',
  'defaultLift',
  'liftRace',
  'heldRefresh',
  'liftEmpty',
  'watcher',
  'watchRefresh',
  'fingerprint',
  'midChange',
  'attack',
  'leak',
  'noDuplicates',
  'overlap',
  'unnamed',
  'residue',
  'removal',
  'nofollow',
  'keychain',
  'scope',
  'shapes',
  'lifecycle',
  'vendorAddress',
  'vendorRefusal',
  'vendorCommit',
  'lineCap',
  'sealed',
  'apns'
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
    JSON.stringify(d.evidence),
    JSON.stringify(d.locks),
    JSON.stringify(d.claudeLock),
    JSON.stringify(d.lockRefusal),
    JSON.stringify(d.defaultLift),
    JSON.stringify(d.liftRace),
    JSON.stringify(d.heldRefresh),
    JSON.stringify(d.liftEmpty),
    JSON.stringify(d.watcher),
    JSON.stringify(d.watchRefresh),
    JSON.stringify(d.fingerprint),
    JSON.stringify(d.midChange),
    JSON.stringify(d.attack),
    JSON.stringify(d.leak),
    JSON.stringify(d.noDuplicates),
    JSON.stringify(d.overlap),
    JSON.stringify(d.unnamed),
    JSON.stringify(d.residue),
    JSON.stringify(d.removal),
    JSON.stringify(d.nofollow),
    JSON.stringify(keychain),
    JSON.stringify(d.scope),
    JSON.stringify(d.shapes),
    JSON.stringify(d.lifecycle),
    JSON.stringify(d.vendorAddress),
    JSON.stringify(d.vendorRefusal),
    JSON.stringify(d.vendorCommit),
    JSON.stringify(d.lineCap),
    JSON.stringify(d.sealed),
    JSON.stringify(d.apns)
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

  // Rule 6 (Phase 211). A STORE UNDER A RUNNING SESSION IS WRITTEN, NOT REFUSED.
  check(live.running.wrote, `${TAG} A SWITCH UNDER A RUNNING SESSION WAS REFUSED rather than reaching it`);
  check(live.running.ownStoreWritten, `${TAG} the login's own store was not written under a running session`);
  check(
    live.running.defaultUntouchedForNonDefault,
    `${TAG} a session on a NON-default login wrote the person's own default location`
  );
  // THE DEFAULT LIFT: a session on the default login writes the vendor location.
  check(live.running.defaultLoginExists, `${TAG} the default-lift arm made no login, so it proves nothing`);
  check(live.running.defaultLiftWrote, `${TAG} THE DEFAULT LIFT DID NOT WRITE the vendor's own location under a running default session`);
  check(
    live.running.defaultStoreNowHolds,
    `${TAG} the default store does not hold the chosen account after the default lift, so the running session cannot follow`
  );

  // Rule 18 (Phase 220). THE SESSION EVIDENCE IS THREE ANSWERS, NOT TWO, and a
  // throw nobody classified is not a successful switch.
  check(
    live.evidence.unavailableRefused,
    `${TAG} AN UNAVAILABLE SESSION ANSWER WAS TREATED AS "NO SESSIONS": the activation went ahead on evidence nobody has`
  );
  check(
    live.evidence.unavailableSays,
    `${TAG} the refusal for an unavailable session answer does not say that is what happened`
  );
  check(
    !live.evidence.unavailableWroteOwn && !live.evidence.unavailableWroteDefault,
    `${TAG} an activation refused for unavailable session evidence still wrote a store`
  );
  check(
    live.evidence.emptyOk && live.evidence.emptyWroteOwn && live.evidence.emptyLeftDefault,
    `${TAG} a KNOWN empty session answer no longer writes the login's own store and leaves the person's own location alone, which is the Phase 211 behaviour this phase must not touch`
  );
  check(
    live.evidence.runningOk && live.evidence.runningLiftedDefault,
    `${TAG} a KNOWN default session no longer lifts the person's own location, which is Phase 211's whole point`
  );
  check(
    !live.evidence.uncertainThrew && live.evidence.uncertainRefused,
    `${TAG} AN UNCLASSIFIED THROW LEFT activateLogin UNCAUGHT, so the registrar decides what it meant`
  );
  check(
    live.evidence.uncertainWroteNothing,
    `${TAG} the arm that proves an unclassified throw before any write had already written one, so it proves nothing`
  );
  check(
    live.evidence.uncertainNamesTheStore,
    `${TAG} the refusal after an unclassified throw does not name the store it may have changed, or does not say the kept accounts survive`
  );
  check(
    !live.evidence.partialThrew && live.evidence.partialReported && live.evidence.partialSays,
    `${TAG} A CONFIRMED WRITE FOLLOWED BY AN UNCLASSIFIED THROW WAS HIDDEN rather than reported as the partial outcome it is`
  );
  check(
    live.evidence.partialKeptTheWrite && live.evidence.partialRecoverable,
    `${TAG} the partial outcome rolled back the write or lost the account that was there`
  );

  // Rule 6b (Phase 211). THE LOCKS. Claude Code's own credential locks.
  check(live.locks.reclaimed, `${TAG} a lock older than the staleness bound was NOT reclaimed, so a dead holder blocks a switch for ever`);
  check(live.locks.neverStole, `${TAG} A LIVE LOCK WAS STOLEN, so a switch can land inside a token refresh`);
  check(live.locks.refusalNamesLock, `${TAG} a lock that could not be taken refused without naming the lock`);
  check(live.locks.refusalHasNoToken, `${TAG} A LOCK REFUSAL NAMED A TOKEN`);
  check(live.locks.locksInOrder, `${TAG} a claude write did not take the vendor's three locks in the vendor's order, being .oauth_refresh.lock, the legacy <config-home>.lock and .storage-write`);
  check(live.locks.allReleased, `${TAG} a claude write left a lock directory behind`);
  check(live.locks.legacyNamedFromRealPath, `${TAG} the legacy lock of a config home that is a link is not named from the real path, so it is not the directory the vendor locks`);
  check(live.locks.neverTheJsonLock, `${TAG} a claude write took the .claude.json lock, which activate never needs`);
  check(live.locks.codexRan && live.locks.codexMadeNoLock, `${TAG} the codex write held a lock; codex holds none`);

  check(live.locks.unwritableImmediate, `${TAG} A LOCK DIRECTORY THAT CANNOT BE MADE WAS WAITED ON, at one core, rather than refused at once`);
  check(live.locks.unwritableSaysWhy, `${TAG} an unmakeable lock refused without naming the lock and saying the folder is not writable`);
  check(live.locks.unwritableNoToken, `${TAG} an unmakeable lock refusal named a token`);
  check(live.locks.nullBranchSleeps, `${TAG} THE LOCK LOOP SPINS: a seam answering not made and not there together ran the whole wait with no sleep`);

  // Rule 6f (Phase 211 fix round). A HELD LOCK IS A REFUSAL, NOT A THROW.
  check(!live.lockRefusal.threw, `${TAG} A LOCK HELD PAST THE WAIT WAS THROWN OUT OF ACTIVATE rather than answered, so the registrar records the choice and the face says switched`);
  check(live.lockRefusal.refused, `${TAG} a lock held past the wait did not refuse the switch`);
  check(live.lockRefusal.reasonNamesLock, `${TAG} the held lock refusal does not name the lock`);
  check(live.lockRefusal.reasonHasNoToken, `${TAG} THE HELD LOCK REFUSAL NAMED A TOKEN`);
  check(live.lockRefusal.holderKept, `${TAG} the live holder's lock was stolen by the refused switch`);
  check(live.lockRefusal.storeUntouched, `${TAG} a refused switch wrote the store anyway`);

  // Rule 6c (Phase 211). A CLAUDE WRITE HOLDS BOTH LOCKS, seen through activate.
  check(live.claudeLock.wrote, `${TAG} the claude lock arm did not write, so the lock check proves nothing`);
  check(
    live.claudeLock.heldAll,
    `${TAG} A CLAUDE SWITCH DID NOT HOLD THE VENDOR'S LOCKS: took ${String(live.claudeLock.lockCount)} rather than 3`
  );

  // Rule 6e (Phase 211 fix round). THE DEFAULT LIFT KEEPS WHAT IT WRITES OVER.
  check(live.defaultLift.wrote, `${TAG} the default lift arm did not write, so the rest of it is a check over an empty world`);
  check(live.defaultLift.itemHoldsChosen, `${TAG} the default lift did not put the chosen account into the vendor's own keychain item`);
  check(
    live.defaultLift.outgoingHeldAfterObserve,
    `${TAG} THE DEFAULT LIFT LOST THE PERSON'S OWN ACCOUNT: the account that was in the default store exists in no slot after the observe that follows a choose, because the lift wrote over it while the vendor's identity file still named it`
  );
  check(
    JSON.stringify(live.defaultLift.logins) === JSON.stringify(['alice.example', 'work']),
    `${TAG} the default lift left the logins as ${JSON.stringify(live.defaultLift.logins)} rather than the chosen one and one promoted from the address`
  );
  check(
    live.defaultLift.recordDigestIsChosen && live.defaultLift.recordEmailIsChosen,
    `${TAG} the default record was not moved on to the chosen account after the lift, so the next observe judges a change instead of reading unchanged bytes`
  );
  check(live.defaultLift.observeChangedNothing, `${TAG} the observe after a lift kept or promoted something, so the lift left the record behind the store`);

  // Rule 6i (committer's round of Phase 211, the verifier's F1). THE LIFT
  // READS UNDER THE LOCK. A refresh the vendor saves while the lift waits for
  // the lock is the bytes that get kept, and the bytes whose refresh token
  // that refresh consumed are held nowhere.
  check(live.liftRace.wrote, `${TAG} the lift race arm did not write, so it proves nothing`);
  check(live.liftRace.contested, `${TAG} the lift race arm never contested the lock, so the vendor refresh it stages never happened`);
  check(live.liftRace.itemHoldsChosen, `${TAG} the lift race left the vendor item without the chosen account`);
  check(
    live.liftRace.refreshedHeldOutsideDefault,
    `${TAG} THE LIFT WROTE OVER A REFRESH THAT LANDED WHILE IT WAITED FOR THE LOCK: the refreshed credential exists in no slot afterwards`
  );
  check(live.liftRace.staleHeldNowhere, `${TAG} the lift kept the bytes whose refresh token the refresh consumed, rather than the refreshed ones`);
  check(live.liftRace.observeChangedNothing, `${TAG} the observe after the lift race kept or promoted something, so the record was left behind the store`);

  // Rule 6j (committer's round of Phase 211, the verifier's F2). A HELD COPY
  // IS BROUGHT UP TO THE NEWER BYTES, and the observe does not put the stale
  // ones back, so the round trip work, alice, work hands the session the
  // refreshed token and not the one whose refresh token was consumed.
  check(live.heldRefresh.switched, `${TAG} the held refresh arm did not make all four switches, so it proves nothing`);
  check(
    live.heldRefresh.refreshedSurvivedRoundTrip,
    `${TAG} THE REFRESHED TOKEN DID NOT SURVIVE THE ROUND TRIP: the held copy kept the pre refresh bytes when the default slot moved on`
  );
  check(live.heldRefresh.sessionGetsRefreshed, `${TAG} choosing the login again put the PRE REFRESH token back into the running session's store`);
  check(live.heldRefresh.staleGoneAfterRoundTrip, `${TAG} the pre refresh bytes, whose refresh token is consumed, are still held somewhere after the round trip`);
  check(live.heldRefresh.ownStoreFreshened, `${TAG} choosing the login again left its own store on the pre refresh bytes`);
  check(live.heldRefresh.newerHeldCopyKept, `${TAG} a held copy captured strictly LATER was written over with older bytes`);

  // Rule 6k (committer's round of Phase 211, the verifier's F3). THE DEFAULT
  // PROMOTION ASKS THE SLOT, so a default store that reads as empty, as
  // garbage or as half a credential at the lift still keeps the account.
  for (const shape of ['empty', 'garbage', 'half']) {
    const arm = live.liftEmpty[shape];
    check(arm !== undefined && arm.wrote, `${TAG} the ${shape} default store arm did not write, so it proves nothing`);
    check(arm !== undefined && arm.itemHoldsChosen, `${TAG} the ${shape} default store arm left the vendor item without the chosen account`);
    check(
      arm !== undefined && arm.outgoingHeld,
      `${TAG} A DEFAULT STORE THAT READ AS ${shape.toUpperCase()} LOST THE ACCOUNT: the lift moved the rolling copy on over the only copy of it`
    );
    check(arm !== undefined && arm.loginMade, `${TAG} the ${shape} default store arm promoted the outgoing account into no login`);
  }

  // Rule 6d (Phase 211). THE WATCHER: one observe per burst, only its file.
  check(live.watcher.watchesADirectory, `${TAG} the watcher opened no directory watcher, so the burst check proves nothing`);
  check(live.watcher.quietBeforeDebounce, `${TAG} the watcher observed before the debounce settled`);
  check(live.watcher.oneObservePerBurst, `${TAG} A BURST OF FILE EVENTS DID NOT COLLAPSE INTO ONE OBSERVE`);
  check(live.watcher.ignoresOtherFiles, `${TAG} the watcher observed for a file it does not watch`);

  // Rule 6g (Phase 211 fix round). A LOGIN MADE AFTER THE START IS WATCHED.
  check(live.watchRefresh.atStart >= 2, `${TAG} the refresh arm started with ${String(live.watchRefresh.atStart)} targets rather than the two defaults at least`);
  check(live.watchRefresh.newDirWatched && live.watchRefresh.grewByOne, `${TAG} A LOGIN ADDED AFTER THE WATCH STARTED IS NOT WATCHED, so a sign in inside a session under it is not seen until the next launch`);
  check(live.watchRefresh.reopened === 0, `${TAG} a refresh with nothing new opened ${String(live.watchRefresh.reopened)} watchers again`);
  check(live.watchRefresh.goneDirClosed, `${TAG} a login removed after the watch started keeps its watcher open`);
  check(live.watchRefresh.stopClosedAll, `${TAG} stop left a watcher open`);

  // Rule 6h (Phase 211 fix round). THE KEYCHAIN BACKSTOP SEES A REWRITE.
  check(live.fingerprint.readSomething && live.fingerprint.askedSomething, `${TAG} the fingerprint arm read nothing, so what it proves next is nothing`);
  check(live.fingerprint.movesOnRewrite, `${TAG} THE KEYCHAIN BACKSTOP CANNOT SEE A SIGN IN: the fingerprint did not move when the item was rewritten under the same account, which is what every sign in does`);
  check(live.fingerprint.neverAsksForThePayload, `${TAG} THE FINGERPRINT ASKED FOR THE PAYLOAD with -w or -g`);

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
  // Rule 14b. AND THE SAME INSIDE TORTIE'S OWN VAULT (Phase 206).
  check(
    live.residue.vaultCrashLeftACredential,
    `${TAG} the vault crash arm staged nothing, so the rest of it is a check over an empty world`
  );
  check(
    live.residue.vaultSweptIt,
    `${TAG} A WHOLE CREDENTIAL LEFT IN TORTIE'S OWN VAULT BY A CRASH IS STILL THERE after a run that observed it`
  );
  check(
    live.residue.vaultDefaultSweptIt,
    `${TAG} the default slot's staged place was left holding a credential`
  );
  check(
    live.residue.vaultNoDirSweptIt,
    `${TAG} A WHOLE CREDENTIAL STAGED BESIDE A SLOT WHOSE FOLDER HAS GONE IS STILL THERE after a run that observed it: the sweep read the directories on disk and that login has none`
  );
  check(
    live.residue.vaultSlotsKept,
    `${TAG} the vault sweep left a staged place behind, or removed a slot that was not one`
  );

  // Rule 16. A LOGIN THE PERSON REMOVES LEAVES NOTHING BEHIND (Phase 206).
  check(
    live.removal.strayHeldACredential,
    `${TAG} the removal arm made no stray holding a credential, so the rest of it is a check over an empty world`
  );
  check(
    live.removal.strayCleared,
    `${TAG} A LOGIN THE PERSON REMOVED STILL HAS A CREDENTIAL NOBODY CAN REACH: its keychain item, its slot, its record row or its folder outlived the removal`
  );
  check(
    live.removal.noDirHeldACredential,
    `${TAG} the no folder arm planted no credential, so the rest of it is a check over an empty world`
  );
  check(
    live.removal.noDirCleared,
    `${TAG} A STRAY WHOSE FOLDER HAS ALREADY GONE STILL HAS A CREDENTIAL NOBODY CAN REACH: its keychain item, its slot or its record row outlived the sweep`
  );
  check(
    live.removal.bareStrayCleared,
    `${TAG} a stray folder that was never signed into was left behind`
  );
  check(
    live.removal.finishedCount === 4,
    `${TAG} the sweep finished ${String(live.removal.finishedCount)} strays rather than the 4 it was given, being three with a folder and one with none`
  );
  check(
    live.removal.droppedBySanitizer,
    `${TAG} the collision arm did not produce a dropped row, so what it proves next is nothing`
  );
  check(
    live.removal.liveKept && live.removal.shadowKept,
    `${TAG} THE SWEEP DELETED A LOGIN THE FILE STILL NAMES, because another row shares its name and the reader drops one of them`
  );
  check(
    live.removal.linkGone,
    `${TAG} a stray that is a symbolic link was left in Tortie's own data`
  );
  check(
    live.removal.victimUntouched,
    `${TAG} FINISHING A STRAY THAT IS A LINK REACHED THROUGH IT and changed a file Tortie does not own`
  );
  check(
    live.removal.interruptedLeftNoCredential,
    `${TAG} a remove interrupted after its first half left a credential no row names`
  );
  check(
    live.removal.interruptedLeftTheFolder,
    `${TAG} the interrupted arm removed the folder too, so it is not the half it claims to measure`
  );
  check(
    live.removal.ownItemUntouched && !live.removal.deleteNamedOwnItem,
    `${TAG} THE PERSON'S OWN KEYCHAIN ITEM was named by a delete or changed by one`
  );
  check(
    live.removal.deletesAsked > 0,
    `${TAG} the removal arm asked the keychain for no delete at all, so the two checks above pass over nothing`
  );

  // Rule 15. A PLANTED LINK AT A STAGED NAME SENDS THE WRITE NOWHERE.
  check(
    live.nofollow.linkPlanted,
    `${TAG} the link arm planted nothing, so the rest of it is a check over an empty world`
  );
  check(
    live.nofollow.storeWritten && live.nofollow.storeHoldsTheNewAccount,
    `${TAG} a link beside a store stopped the write reaching the store at all`
  );
  check(
    live.nofollow.storeVictimUntouched,
    `${TAG} A LINK PLANTED BESIDE A STORE SENT THE WRITE THROUGH IT, into a path outside the login directories`
  );
  check(
    live.nofollow.storeIsAFile,
    `${TAG} the commit renamed a link onto a store, so the store is now a link`
  );
  check(
    live.nofollow.vaultWritten && live.nofollow.vaultVictimUntouched,
    `${TAG} A LINK PLANTED IN TORTIE'S OWN STORE TOOK THE WRITE`
  );
  check(
    live.nofollow.recordWritten && live.nofollow.recordVictimUntouched,
    `${TAG} A LINK PLANTED BESIDE THE RECORD FILE TOOK THE WRITE`
  );
  check(
    live.nofollow.renameRefusedALink && live.nofollow.lateVictimUntouched,
    `${TAG} a link planted between the write and the commit was renamed onto the store`
  );
  // Rule 15b (Phase 211 fix round). THE READ SIDE OF THE SAME GUARD.
  check(live.nofollow.readRefusesALink, `${TAG} A LINK AT A STORE'S NAME IS READ THROUGH, so a planted entry reads somebody else's store into a login's slot on any event the watcher sees`);
  check(live.nofollow.readReadsAFile && live.nofollow.readMissingIsNull, `${TAG} the nofollow read does not read a plain file, or throws for a missing one`);

  // Rule 9 and rule 10.
  check(!live.leak.tokenInAnswers, `${TAG} A TOKEN BYTE REACHED AN ANSWER THIS DOMAIN GIVES`);
  check(live.leak.recordHasDigest, `${TAG} the record file holds no digest, so the leak scan is over an empty file`);
  check(live.keychain.promoted && live.keychain.activated, `${TAG} the keychain arm did not run to the end`);
  check(live.keychain.bytesExact, `${TAG} THE KEYCHAIN ROUND TRIP IS NOT BYTE EXACT`);
  // PHASE 281. This was "the account attribute is preserved", which copied the
  // account off whatever item the name matched. The write's account is now the
  // vendor rule's over the arm's environment and user name, and nothing else.
  check(
    live.keychain.accountIsVendorRule,
    `${TAG} A WRITE BACK DID NOT LAND UNDER THE VENDOR RULE'S ACCOUNT, being claudeKeychainAccount of the arm's environment and user name, or it landed as a second item beside one`
  );
  check(live.keychain.ownItemUntouched, `${TAG} THE PERSON'S OWN KEYCHAIN ITEM WAS WRITTEN`);
  check(
    live.keychain.strayUntouched,
    `${TAG} THE STRAY UNDER THE PERSON'S OWN ITEM'S NAME WAS READ, REWRITTEN, MOVED OR NAMED by the keychain arm`
  );
  check(
    live.keychain.itemsNamed.length === 3,
    `${TAG} the keychain holds ${String(live.keychain.itemsNamed.length)} items rather than the stray, the person's own and the one login's`
  );
  check(live.keychain.argvCount > 0, `${TAG} the keychain arm made no calls, so the argv check proves nothing`);
  check(!live.keychain.tokenInArgv, `${TAG} A CREDENTIAL REACHED A COMMAND LINE`);
  check(live.keychain.payloadInStdin, `${TAG} no write went over stdin, so the argv check proves nothing`);
  check(!live.keychain.everPassedA, `${TAG} -A WAS PASSED, which trusts every program on the machine`);
  check(!live.keychain.stagedLeft, `${TAG} a staged keychain item was left behind`);
  // PHASE 281, after verification. The probe's `security` must keep the order
  // the real program was measured to keep, or every order-sensitive reading
  // above is a reading of a keychain that does not exist.
  check(
    live.keychain.updateMovesBehind,
    `${TAG} the probe's security updates an item in place, and the real one moves an updated item behind every other item of its service name`
  );

  // Rule 17. THE VAULT IS SCOPED TO ITS PROFILE (Phase 208).
  //
  // A DOMAIN WITH NO MIGRATION FAILS HERE, IN WORDS (Phase 219, item 4c).
  // Until this round the probe imported `migrate.ts` at the top level, so a
  // copy of the domain from before Phase 208 killed the whole run with a raw
  // ERR_MODULE_NOT_FOUND, the gate printed "the probe did not run" with 600
  // characters of node stack, and NO rule was named. A gate that dies is not a
  // gate that fails.
  check(
    live.scope.absent !== true,
    `${TAG} RULE 17 CANNOT RUN: the domain has no migrate.ts, so nothing moves an item a tree before Phase 208 wrote under the unscoped name onto the scoped one`
  );
  if (live.scope.absent === true) {
    // Every reading below is the migration's own. Naming them one by one when
    // there is no migration would print seventeen failures for one cause.
    notes.push(`${TAG} rule 17 had no migrate.ts to run, so its readings are absent`);
  } else {
  check(live.scope.differ, `${TAG} A SCRATCH ROOT AND THE PERSON'S ROOT COMPOSE THE SAME KEYCHAIN NAME, so every profile on the machine addresses one item`);
  check(live.scope.neverUnscoped, `${TAG} A NAME COMPOSED FROM A ROOT EQUALS THE UNSCOPED ONE a tree before Phase 208 wrote`);
  check(live.scope.digestRederived, `${TAG} the scope digest is not the first eight hex of a sha256 of the root`);
  check(live.scope.emptyScopeThrows, `${TAG} an empty scope composed a name rather than throwing`);
  check(live.scope.composerAgrees, `${TAG} the unscoped composer in migrate.ts does not spell the old name`);
  check(live.scope.backendNamesScoped, `${TAG} the keychain backend wrote somewhere other than the scoped name`);
  check(live.scope.crossProfileHidden, `${TAG} a slot one profile wrote is visible to another`);
  // THE READ-THROUGH, step by step (Phase 304). A miss with a scoped item
  // planted is the migration: exactly one find and one delete, no `-i` line,
  // the sealed file written and opening to the item's bytes, the item gone,
  // and the next read a hit that sends nothing. Then one thing made to fail
  // at a time, and on every arm the answer is the item's bytes, because a
  // caller is never told "nothing" about a credential that exists.
  const rt = live.scope.readThrough;
  check(
    rt !== undefined && rt !== null,
    `${TAG} RULE 17 CANNOT DRIVE THE READ-THROUGH: the probe gave no readThrough readings`
  );
  if (rt !== undefined && rt !== null) {
    const FIND_THEN_DELETE = JSON.stringify(['find -s <scoped> -w', 'delete -s <scoped>']);
    const FIND_ONLY = JSON.stringify(['find -s <scoped> -w']);
    check(
      rt.miss.answered === true &&
        JSON.stringify(rt.miss.argvs) === FIND_THEN_DELETE &&
        rt.miss.lines === 0 &&
        rt.miss.filePresent === true &&
        rt.miss.fileOpens === true &&
        rt.miss.fileIsNotThePayload === true &&
        rt.miss.itemPresent === false,
      `${TAG} A MISS WITH A SCOPED ITEM PLANTED DID NOT MOVE IT IN THE SAFE ORDER: ${JSON.stringify(rt.miss)}; the file must be written sealed, read back, and only then the item deleted, over exactly one find and one delete and no -i line`
    );
    check(
      rt.miss.secondAnswered === true && rt.miss.secondArgvs.length === 0,
      `${TAG} the read after the read-through sent ${JSON.stringify(rt.miss.secondArgvs)}: a hit on the sealed file must ask the keychain nothing`
    );
    check(
      rt.refusedDelete.answered === true &&
        JSON.stringify(rt.refusedDelete.argvs) === FIND_THEN_DELETE &&
        rt.refusedDelete.filePresent === true &&
        rt.refusedDelete.fileOpens === true &&
        rt.refusedDelete.itemPresent === true &&
        rt.refusedDelete.secondAnswered === true &&
        rt.refusedDelete.secondArgvs.length === 0,
      `${TAG} A DELETE SECURITY REFUSED LEFT THE WRONG COPIES: ${JSON.stringify(rt.refusedDelete)}; the item AND the file must both stay, and the next read must be a hit that sends nothing`
    );
    check(
      rt.wrapNull.answered === true &&
        JSON.stringify(rt.wrapNull.argvs) === FIND_ONLY &&
        rt.wrapNull.filePresent === false &&
        rt.wrapNull.itemPresent === true &&
        rt.wrapNull.secondAnswered === true &&
        JSON.stringify(rt.wrapNull.secondArgvs) === FIND_ONLY,
      `${TAG} A SEAL THAT COULD NOT BE MADE DURING THE READ-THROUGH left ${JSON.stringify(rt.wrapNull)}: the answer must be the item's bytes, no file may be written, nothing may be deleted, and the next read must ask the item again`
    );
    check(
      rt.openWrong.answered === true &&
        JSON.stringify(rt.openWrong.argvs) === FIND_ONLY &&
        rt.openWrong.filePresent === true &&
        rt.openWrong.itemPresent === true,
      `${TAG} A READ-BACK THAT DISAGREED STILL DELETED THE ITEM: ${JSON.stringify(rt.openWrong)}; the item must stay until the sealed file has been read back equal`
    );
  }
  // THE SWEEP (Phase 304). A scoped item beside a sealed file is the one shape
  // the read-through cannot reach, because a hit asks the keychain nothing:
  // the boot pass must delete it and count it, leaving the file as it was; and
  // when the record names the ITEM's bytes and not the file's, an older build
  // wrote the item after this profile had a file, so the file is rewritten
  // from the item first, counted as moved, and the item then deleted. And the
  // fourth shape (the fix round): the bytes differ and the record names
  // NEITHER, so nothing proves which copy this profile can reach, and the
  // pass leaves both, counted as kept, because the phase's charter is never
  // zero copies and this was the one arm that destroyed an unproven one.
  const sw = live.scope.sweep;
  check(
    sw !== undefined && sw !== null,
    `${TAG} RULE 17 CANNOT DRIVE THE SWEEP: the probe gave no sweep readings`
  );
  if (sw !== undefined && sw !== null) {
    check(
      sw.duplicate.result.refused === false &&
        sw.duplicate.result.moved === 0 &&
        sw.duplicate.result.deleted === 1 &&
        sw.duplicate.result.kept === 0 &&
        sw.duplicate.result.failed === 0 &&
        sw.duplicate.itemGone === true &&
        sw.duplicate.fileHoldsSealed === true &&
        sw.duplicate.lines === 0,
      `${TAG} THE BOOT PASS DID NOT SWEEP THE SCOPED DUPLICATE BESIDE A SEALED FILE: ${JSON.stringify(sw.duplicate)}; it must delete the item, count one delete, rewrite nothing and compose no -i line`
    );
    check(
      sw.recordedTwin.result.refused === false &&
        sw.recordedTwin.result.moved === 1 &&
        sw.recordedTwin.result.deleted === 1 &&
        sw.recordedTwin.result.kept === 0 &&
        sw.recordedTwin.result.failed === 0 &&
        sw.recordedTwin.itemGone === true &&
        sw.recordedTwin.fileHoldsTwin === true &&
        sw.recordedTwin.fileHoldsSealed === false &&
        sw.recordedTwin.lines === 0,
      `${TAG} THE OLDER BUILD'S ITEM THE RECORD NAMES WAS NOT REWRITTEN INTO THE FILE BEFORE THE DELETE: ${JSON.stringify(sw.recordedTwin)}; the file must hold the item's bytes, counted as one move and one delete`
    );
    check(
      sw.unprovenTwin !== undefined &&
        sw.unprovenTwin.result.refused === false &&
        sw.unprovenTwin.result.moved === 0 &&
        sw.unprovenTwin.result.deleted === 0 &&
        sw.unprovenTwin.result.kept === 1 &&
        sw.unprovenTwin.result.failed === 0 &&
        sw.unprovenTwin.itemGone === false &&
        sw.unprovenTwin.fileHoldsSealed === true &&
        sw.unprovenTwin.fileHoldsTwin === false &&
        sw.unprovenTwin.lines === 0,
      `${TAG} A SCOPED ITEM WHOSE BYTES THE RECORD DOES NOT NAME, BESIDE A FILE IT DOES NOT NAME EITHER, WAS NOT LEFT IN PLACE: ${JSON.stringify(sw.unprovenTwin)}; nothing proves which copy this profile can reach, so the pass must delete nothing, rewrite nothing, and count the slot as kept`
    );
  }
  check(
    live.scope.ownProfile.own && !live.scope.ownProfile.scratch && !live.scope.ownProfile.probes && !live.scope.ownProfile.smoke,
    `${TAG} isOwnProfile misread a shape: ${JSON.stringify(live.scope.ownProfile)}`
  );
  check(live.scope.migration.presentMoved, `${TAG} AN UNSCOPED ITEM WAS NOT MOVED UNDER THE SCOPED NAME AND DELETED, so a credential nobody can reach survives`);
  check(live.scope.migration.absentUntouched, `${TAG} the migration wrote or deleted with no unscoped item present`);
  check(live.scope.migration.refusedNamesNothing, `${TAG} A PROFILE THAT IS NOT THE PERSON'S OWN COMPOSED THE UNSCOPED NAME`);
  check(live.scope.migration.recordedOldRewritten, `${TAG} the scoped copy was not rewritten from the old item the record names`);
  check(live.scope.migration.stagedResidueDeleted, `${TAG} a staged leftover under the old name survived the migration`);
  check(live.scope.migration.presentNamedUnscoped, `${TAG} the present arm never named the unscoped item, so the refusal arm proves nothing`);
  check(live.scope.migration.badReadbackKept, `${TAG} THE OLD ITEM WAS DELETED THOUGH THE SCOPED COPY NEVER LANDED, so the credential is gone from both names`);

  // Rule 17b. A HOME BEHIND A LINK (Phase 219, item 4a).
  for (const [why, got] of live.scope.linkedProfile.verdicts) {
    check(
      got === 'own',
      `${TAG} A REAL LINK OVER THE PROFILE (${why}) READ AS ${String(got)}, so the migration is refused for ever on that machine and the credential stays under a name nothing can reach`
    );
  }
  check(
    live.scope.linkedProfile.scratchStillRefused.every((v) => v === 'elsewhere'),
    `${TAG} A SCRATCH PROFILE PASSED once a link was in the path, so the real path fallback widened the predicate rather than fixing it: ${JSON.stringify(live.scope.linkedProfile.scratchStillRefused)}`
  );
  check(
    JSON.stringify(live.scope.reasons) === JSON.stringify(['harness', 'no-paths', 'elsewhere', 'own']),
    `${TAG} the profile verdict does not say WHICH refusal it is: ${JSON.stringify(live.scope.reasons)}`
  );
  check(
    live.scope.migration.refusedReason === 'elsewhere' && live.scope.migration.ranReason === null,
    `${TAG} a refused migration did not carry its reason out, so a log line cannot tell a probe from a home behind a link: ${JSON.stringify([live.scope.migration.refusedReason, live.scope.migration.ranReason])}`
  );

  // Rule 17c. A DELETE THAT FAILED (Phase 219, item 4b).
  check(
    live.scope.migration.failedDelete.deleted === 0 &&
      live.scope.migration.failedDelete.failed === 2,
    `${TAG} A DELETE SECURITY REFUSED WAS COUNTED AS A DELETE: ${JSON.stringify(live.scope.migration.failedDelete)}`
  );
  check(
    live.scope.migration.failedDelete.stillThere,
    `${TAG} the refusing arm's items were gone, so this probe stopped testing a delete that fails`
  );
  check(
    live.scope.migration.succeededDelete,
    `${TAG} a delete that SUCCEEDED was not counted as one, so the count above proves nothing`
  );
  }

  // Rule 20 (Phase 281). THE ITEM CLAUDE CODE READS, AND NO OTHER.
  const va = live.vendorAddress;
  const vr = live.vendorRefusal;
  const vc = live.vendorCommit;
  check(
    va !== undefined && vr !== undefined && vc !== undefined,
    `${TAG} RULE 20 CANNOT RUN: the probe gave no Phase 281 readings`
  );
  if (va !== undefined && vr !== undefined && vc !== undefined) {
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const swapCalls = (name) => [
      `add -a vendor -s ${name}.staged`,
      `find -a vendor -s ${name}.staged -w`,
      `add -a vendor -s ${name}`,
      `find -a vendor -s ${name} -w`,
      `delete -a vendor -s ${name}.staged`
    ];
    // 20a. Every function that names a vendor item, over strays placed first.
    check(
      same(va.read.calls, ['find -a vendor -s plain -w']) &&
        va.read.where === 'keychain' &&
        va.read.account === 'vendor' &&
        va.read.vendorBytes,
      `${TAG} READSTORE DID NOT READ THE ITEM CLAUDE CODE READS: with a stray first under the same name it sent ${JSON.stringify(va.read.calls)} and answered ${String(va.read.where)} under ${String(va.read.account)}`
    );
    check(
      same(va.settled.calls, ['find -a vendor -s plain -w', 'find -a vendor -s plain -w']) &&
        va.settled.vendorBytes,
      `${TAG} readSettledStore did not settle on the vendor item: it sent ${JSON.stringify(va.settled.calls)}`
    );
    check(
      same(va.readLogin.calls, ['find -a vendor -s D -w']) &&
        va.readLogin.account === 'vendor' &&
        va.readLogin.vendorBytes,
      `${TAG} A LOGIN'S STORE WAS NOT READ UNDER THE VENDOR ACCOUNT: it sent ${JSON.stringify(va.readLogin.calls)}`
    );
    check(
      same(va.target.calls, swapCalls('D')) && va.target.ok && va.target.vendorItemHoldsIt,
      `${TAG} STORETARGET'S STAGE, STAGED READ, COMMIT, CONFIRM AND DISCARD DO NOT ALL CARRY THE VENDOR ACCOUNT: they sent ${JSON.stringify(va.target.calls)}`
    );
    check(
      same(va.lift.calls, swapCalls('plain')) && va.lift.ok && va.lift.vendorItemHoldsIt,
      `${TAG} DEFAULTSTORETARGET'S STAGE, STAGED READ, COMMIT, CONFIRM AND DISCARD DO NOT ALL CARRY THE VENDOR ACCOUNT: they sent ${JSON.stringify(va.lift.calls)}`
    );
    check(
      same(va.forget.calls, ['delete -a vendor -s D', 'delete -a vendor -s D.staged']) &&
        va.forget.vendorItemGone,
      `${TAG} FORGETSTORE DID NOT DELETE UNDER THE VENDOR ACCOUNT, so a remove reaches the first item of the name or leaves the login's own: it sent ${JSON.stringify(va.forget.calls)}`
    );
    check(
      same(va.fingerprint.calls, ['find -a vendor -s plain', 'find -a vendor -s plain']) &&
        va.fingerprint.namesVendor &&
        !va.fingerprint.namesStray,
      `${TAG} THE KEYCHAIN BACKSTOP DOES NOT FINGERPRINT THE VENDOR ITEM: it sent ${JSON.stringify(va.fingerprint.calls)}${va.fingerprint.namesStray ? ' and read the stray' : ''}`
    );
    check(
      same(va.configDir.calls, ['find -a vendor -s C -w', 'find -a vendor -s C', 'find -a vendor -s C']) &&
        va.configDir.readNothing,
      `${TAG} WITH CLAUDE_CONFIG_DIR SET AND NO SCOPED ITEM, A READER ASKED ANOTHER NAME or answered a credential, which no Claude Code session under that directory would find: it sent ${JSON.stringify(va.configDir.calls)}`
    );
    check(
      va.vendorCalls > 0 && va.unaddressed === 0,
      `${TAG} ${String(va.unaddressed)} OF ${String(va.vendorCalls)} CALLS AIMED AT A VENDOR NAME DID NOT CARRY -a WITH THE VENDOR ACCOUNT`
    );
    check(
      !va.strayNamed && va.straysUntouched && !va.strayBytesAnswered,
      `${TAG} A STRAY UNDER A VENDOR NAME WAS NAMED, READ, REWRITTEN OR DELETED, which is research 126's stray on the operator's machine: ${JSON.stringify({ named: va.strayNamed, untouched: va.straysUntouched, answered: va.strayBytesAnswered })}`
    );
    // 20c. No account, no call.
    check(
      vr.asked > 0 && vr.refusedReached === 0 && vr.refusedAnswers && vr.rowsKept,
      `${TAG} A VENDOR NAME WITH NO ACCOUNT REACHED SECURITY ${String(vr.refusedReached)} TIMES out of ${String(vr.asked)} asks, so a lookup by service alone is still possible`
    );
    check(
      same(vr.addressed, [
        'find-generic-password -a p281-vendor -s Claude Code-credentials -w',
        'find-generic-password -a p281-vendor -s Claude Code-credentials',
        'find-generic-password -a p281-vendor -s Claude Code-credentials',
        'find-generic-password -a p281-vendor -s Claude Code-credentials'
      ]),
      `${TAG} the refusal refused more than it should: the same calls WITH the vendor account sent ${JSON.stringify(vr.addressed)}`
    );
    check(
      vr.outsideExact,
      `${TAG} A NAME OUTSIDE CLAUDE CODE'S NAMESPACE no longer sends the service-only command line Tortie's own vault names always sent`
    );
    // 20d. A directory with no scoped item commits under the vendor account.
    for (const [why, arm] of Object.entries(vc)) {
      const e = arm.expected;
      check(
        arm.ruleAgrees && arm.targetOk && arm.liftOk,
        `${TAG} the ${why} commit arm did not run to the end, so what it proves next is nothing`
      );
      check(
        same(arm.targetAdds, [`add -a ${e} -s E.staged`, `add -a ${e} -s E`]) &&
          same(arm.eRows, [`${e}:chosen`]),
        `${TAG} STORETARGET FOR A DIRECTORY WITH NO SCOPED ITEM DID NOT COMMIT UNDER THE VENDOR RULE'S ACCOUNT (${why}), the regression research 126 §8.10 measured as add -U -a "unknown": it sent ${JSON.stringify(arm.targetAdds)} and left ${JSON.stringify(arm.eRows)}`
      );
      check(
        same(arm.liftAdds, [`add -a ${e} -s plain.staged`, `add -a ${e} -s plain`]) &&
          same(arm.plainRows, ['stray:other', `${e}:lifted`]),
        `${TAG} DEFAULTSTORETARGET DID NOT COMMIT UNDER THE VENDOR RULE'S ACCOUNT (${why}), so the default lift updates an item no Claude Code session reads: it sent ${JSON.stringify(arm.liftAdds)} and left ${JSON.stringify(arm.plainRows)}`
      );
      check(arm.straysUntouched, `${TAG} the ${why} commit arm changed the stray`);
    }
    notes.push(
      `${String(va.vendorCalls)} vendor keychain calls over strays placed first, every one under the vendor account, ${String(vr.asked)} asks with no account and ${String(vr.refusedReached)} reaching security, ${String(Object.keys(vc).length)} account rule shapes committing where Claude Code reads`
    );
  }

  // -------------------------------------------------------------------------
  // Rule 21 (Phase 287), the driven half. A LINE `security` WOULD CUT IS
  // REFUSED BY ITS BYTES, AND THE PERSON IS TOLD.
  //
  // The sentence is read out of `src/shared/login-copy.ts` rather than written
  // here, because that file is the one place the words live and
  // `conformance:logins` is the gate that keeps them there. So this gate checks
  // the whole chain, from the refusal in the write to the words a surface draws,
  // and a sentence changed in one place and not the other is caught by one of
  // the two gates rather than by neither.
  // -------------------------------------------------------------------------
  const tooLargeSentence =
    /export const LOGIN_TOO_LARGE_SENTENCE\s*=\s*\n?\s*'([^']*)'/.exec(
      readFileSync(join(repoRoot, 'src/shared/login-copy.ts'), 'utf8')
    )?.[1] ?? null;
  check(
    tooLargeSentence !== null,
    `${TAG} RULE 21 CANNOT READ ITS SENTENCE: src/shared/login-copy.ts declares no LOGIN_TOO_LARGE_SENTENCE`
  );
  const lc = live.lineCap;
  check(
    lc !== undefined && lc.absent !== true,
    `${TAG} RULE 21 CANNOT RUN: the domain gave no Phase 287 readings, so it carries no cap in bytes and no named reason`
  );
  if (lc !== undefined && lc.absent !== true && tooLargeSentence !== null) {
    const says = (value) => value === tooLargeSentence;
    // (d) THE CAP IS A COUNT OF BYTES, asked of the one comparison over a string
    // whose bytes are twice its UTF-16 units.
    check(
      lc.unitsAtCap * 2 === lc.cap && lc.fitsAtCap === true && lc.fitsOverCap === false,
      `${TAG} securityLineFits answered ${String(lc.fitsAtCap)} for a line of exactly the cap in bytes and ${String(lc.fitsOverCap)} for one byte more, over ${String(lc.unitsAtCap)} UTF-16 units against a cap of ${String(lc.cap)} bytes`
    );
    // (e) THE ONE WRITE. Its line is byte for byte today's at the cap, and two
    // bytes over it rejects with the named reason and never calls its runner.
    check(
      lc.write.atCapAnswer === true &&
        lc.write.calls === 1 &&
        lc.write.sentBytes === lc.cap &&
        lc.write.sentExact === true,
      `${TAG} A CREDENTIAL UNDER THE CAP IS NO LONGER WRITTEN AS IT IS TODAY: a line of exactly ${String(lc.cap)} bytes answered ${String(lc.write.atCapAnswer)} after ${String(lc.write.calls)} call(s) and ${lc.write.sentExact ? 'matched' : 'DID NOT MATCH'} add-generic-password -U -a … -s … -X <hex> byte for byte`
    );
    check(
      lc.write.overAnswer === null &&
        lc.write.overThrew === 'CredentialTooLarge' &&
        lc.write.overIsClass === true &&
        lc.write.callsAfterOver === 1,
      `${TAG} keychainWrite two bytes over the cap answered ${JSON.stringify(lc.write.overAnswer)} and threw ${String(lc.write.overThrew)} (the class itself: ${String(lc.write.overIsClass)}) after ${String(lc.write.callsAfterOver)} runner call(s); it must reject CredentialTooLarge with its runner never called, so no fake and no real security ever sees a line this long`
    );
    check(
      lc.write.overNamesPayload === false,
      `${TAG} THE REFUSAL NAMES THE PAYLOAD OR ITS LENGTH, which is exactly what this domain never puts in an error`
    );
    // (f) THE RUNNER, over a keychain path of multi-byte letters. This is
    // finding 5: `isPlainKeychainPath` caps UTF-16 units, so the suffix alone
    // takes a line that passes a `.length` cap past the measured buffer, and at
    // the parent the program was SPAWNED with 4,100 bytes.
    check(
      lc.runner.overUnits === lc.cap && lc.runner.overBytes > lc.cap,
      `${TAG} the runner arm's line is ${String(lc.runner.overUnits)} UTF-16 units and ${String(lc.runner.overBytes)} bytes against a cap of ${String(lc.cap)}, so it is not the shape that walks past a cap compared in units and it proves nothing`
    );
    check(
      lc.runner.refusedCode === 1 &&
        lc.runner.refusedTooLong === true &&
        lc.runner.refusedCounted === 0,
      `${TAG} A SUFFIXED LINE OVER THE MEASURED BUFFER WAS NOT REFUSED BY ITS BYTES: exit ${String(lc.runner.refusedCode)}, tooLong ${String(lc.runner.refusedTooLong)}, and securityCallCount moved by ${String(lc.runner.refusedCounted)} for a call nothing ran`
    );
    check(
      lc.runner.underBytes <= lc.cap &&
        lc.runner.spawnedCode === 1 &&
        lc.runner.spawnedTooLong === null &&
        lc.runner.spawnedCounted === 1,
      `${TAG} a line of ${String(lc.runner.underBytes)} bytes, under the cap, answered tooLong ${String(lc.runner.spawnedTooLong)} and moved the count by ${String(lc.runner.spawnedCounted)}: a line that fits must reach the spawn exactly as today, or this arm cannot tell a refusal from a run`
    );
    // (g) L5. THE VENDOR STAGE THAT DOES NOT FIT THOUGH THE VAULT DID. Since
    // Phase 304 this is the ONE refusal for size left in the domain: Tortie's
    // own vault is a sealed file and keeps the payload, so what cannot take
    // the line is the vendor's own item, reached whenever the vendor's account
    // is long enough to carry the staged line over the cap.
    check(
      lc.l5.vaultKeptIt === true &&
        lc.l5.sealedIntact === true &&
        lc.l5.vendorLineBytes > lc.cap,
      `${TAG} the L5 arm's payload is not the shape it needs: the vendor line is ${String(lc.l5.vendorLineBytes)} bytes against a cap of ${String(lc.cap)}, with the sealed vault ${lc.l5.vaultKeptIt ? 'holding' : 'NOT HOLDING'} it before and ${lc.l5.sealedIntact ? 'holding' : 'NOT HOLDING'} it after`
    );
    check(
      lc.l5.ok === false && says(lc.l5.reason) && lc.l5.why === 'too-large',
      `${TAG} the vendor stage that does not fit answered ${JSON.stringify({ ok: lc.l5.ok, why: lc.l5.why })} rather than the fixed sentence and the named reason`
    );
    check(
      lc.l5.lines === 0 && lc.l5.itemAdded === false,
      `${TAG} a refused vendor stage sent ${String(lc.l5.lines)} command line(s) and ${lc.l5.itemAdded ? 'ADDED' : 'did not add'} the login's item: the refusal is by bytes ahead of any spawn, so no -i line may be composed and nothing may land`
    );
    // (g') L5b. THE DEFAULT LIFT MEETS THE VENDOR'S CEILING WHILE THE LOGIN'S
    // OWN STORE ALREADY HOLDS THE ACCOUNT. The one switch that STANDS with a
    // named reason, and since Phase 304 the only path on which the running
    // toast is said: the choice is recorded, nothing is written, the default
    // item holds its own bytes, the outgoing default account was promoted into
    // a login of its own before the refusal, and the reason travels out so the
    // renderer says the sentence for the running session rather than the
    // switched one. Its control with NO default session carries no reason,
    // because nothing was tried and nothing failed.
    check(
      lc.l5bRunning.ok === true &&
        lc.l5bRunning.wrote === false &&
        lc.l5bRunning.why === 'too-large' &&
        lc.l5bRunning.defaultHoldsItsBytes === true &&
        lc.l5bRunning.ownStoreHoldsItsBytes === true &&
        lc.l5bRunning.outgoingPromoted === true &&
        lc.l5bRunning.chosen === 'long' &&
        lc.l5bRunning.lines === 0,
      `${TAG} THE DEFAULT LIFT MEETING THE VENDOR'S CEILING answered ${JSON.stringify(lc.l5bRunning)} with a default session live: the choice must stand with nothing written and the reason carried, both items byte identical, the outgoing account promoted and no -i line composed, because answering a refusal there would stop a click that works today from working`
    );
    check(
      lc.l5bIdle.ok === true &&
        lc.l5bIdle.wrote === false &&
        lc.l5bIdle.why === null &&
        lc.l5bIdle.defaultHoldsItsBytes === true &&
        lc.l5bIdle.ownStoreHoldsItsBytes === true &&
        lc.l5bIdle.outgoingPromoted === false &&
        lc.l5bIdle.chosen === 'long' &&
        lc.l5bIdle.lines === 0,
      `${TAG} the same click with NO default session running answered ${JSON.stringify(lc.l5bIdle)}: it must answer ok with nothing written, the choice recorded and NO reason, because nothing was tried and nothing failed`
    );
    // (h) NO REGRESSION. An under-cap switch sends today's lines, and the
    // existing `keychain` arm's readings are compared by the ablation loop
    // whatever this arm says.
    check(
      lc.plain.ok === true &&
        lc.plain.wrote === true &&
        JSON.stringify(lc.plain.lines) ===
          JSON.stringify([
            'add -a gate -s Claude Code-credentials-<digest>.tortie-pending -X <93 bytes>',
            'add -a gate -s Claude Code-credentials-<digest> -X <93 bytes>'
          ]),
      `${TAG} AN UNDER-CAP SWITCH NO LONGER SENDS THE LINES IT SENDS TODAY: it sent ${JSON.stringify(lc.plain.lines)} and answered ${JSON.stringify({ ok: lc.plain.ok, wrote: lc.plain.wrote })}`
    );
    notes.push(
      `the cap refuses by bytes at ${String(lc.cap)} (${String(lc.runner.overBytes)} bytes of ${String(lc.runner.overUnits)} units refused, 0 counted, 0 spawned), the vendor arm alone says the one sentence and the switch that stood carries its reason`
    );
  }

  // -------------------------------------------------------------------------
  // Rule 22 (Phase 304), the driven half. TORTIE'S OWN VAULT HAS NO SIZE
  // LIMIT. The shipping `vaultPut` and `vaultGet` over the shipping
  // `sealedVault`, at the size of his own `~/.codex/auth.json`, at 64 KB and
  // at 1 MB. Every comparison is by digest and by length; the probe never
  // prints a payload byte and this gate never reads one.
  // -------------------------------------------------------------------------
  const sd = live.sealed;
  check(
    sd !== undefined && sd !== null && sd.absent !== true,
    `${TAG} RULE 22 CANNOT RUN: the domain has no sealedVault, so Tortie's own store still has whatever ceiling its backend has`
  );
  if (sd !== undefined && sd !== null && sd.absent !== true) {
    check(
      JSON.stringify(sd.trips.map((t) => t.bytes)) === JSON.stringify([4193, 65536, 1048576]),
      `${TAG} the size arm drove ${JSON.stringify(sd.trips.map((t) => t.bytes))} rather than 4,193, 65,536 and 1,048,576 bytes, so it does not reach the size of his own codex store or a megabyte`
    );
    for (const t of sd.trips) {
      check(
        t.putOk === true && t.answerBytes === t.bytes && t.digestEqual === true,
        `${TAG} A PAYLOAD OF ${String(t.bytes)} BYTES DID NOT ROUND TRIP THROUGH TORTIE'S OWN STORE: put ${String(t.putOk)}, ${String(t.answerBytes)} bytes back, digest ${t.digestEqual ? 'equal' : 'DIFFERENT'}`
      );
      check(
        t.filePresent === true && t.fileIsNotThePayload === true && t.fileHoldsNoWindow === true,
        `${TAG} THE FILE ON DISK IS THE PAYLOAD, OR HOLDS A WINDOW OF IT, at ${String(t.bytes)} bytes: present ${String(t.filePresent)}, not the payload ${String(t.fileIsNotThePayload)}, no 64 byte window ${String(t.fileHoldsNoWindow)}; a credential is never on disk in the clear`
      );
      check(
        t.fileMode === 0o600,
        `${TAG} the sealed file at ${String(t.bytes)} bytes has mode ${t.fileMode === null ? 'none' : t.fileMode.toString(8)} rather than 0600`
      );
      check(
        t.argvsOnPut === 0 && t.argvsOnGet === 0 && t.linesSent === 0,
        `${TAG} A PUT OR A HIT ON TORTIE'S OWN STORE REACHED security: ${String(t.argvsOnPut)} argv(s) on the put, ${String(t.argvsOnGet)} on the get, ${String(t.linesSent)} -i line(s), at ${String(t.bytes)} bytes; the sealed file must spawn nothing`
      );
    }
    check(
      sd.dirMode === 0o700,
      `${TAG} the vault directory has mode ${sd.dirMode === null ? 'none' : sd.dirMode.toString(8)} rather than 0700`
    );
    check(
      sd.noSeal.ok === false &&
        sd.noSeal.reason === 'Nothing could be written, so nothing changed.' &&
        sd.noSeal.why === null,
      `${TAG} A SEAL THAT COULD NOT BE MADE did not refuse in the one write's own sentence: ${JSON.stringify({ ok: sd.noSeal.ok, reason: sd.noSeal.reason, why: sd.noSeal.why })}`
    );
    check(
      sd.noSeal.filePresent === false &&
        sd.noSeal.stagedPresent === false &&
        sd.noSeal.argvs === 0 &&
        sd.noSeal.lines === 0,
      `${TAG} A SEAL THAT COULD NOT BE MADE STILL LEFT SOMETHING: file ${String(sd.noSeal.filePresent)}, staged ${String(sd.noSeal.stagedPresent)}, ${String(sd.noSeal.argvs)} argv(s), ${String(sd.noSeal.lines)} line(s); nothing may be kept in the clear and nothing may be spawned`
    );
    notes.push(
      `Tortie's own store round trips ${sd.trips.map((t) => String(t.bytes)).join(', ')} bytes by sha256 with the file never the payload, 0600 in 0700, no security argv on any put or hit, and no seal keeps nothing`
    );
  }

  // -------------------------------------------------------------------------
  // Rule 23 (Phase 314), the driven half. THE APPLE PUSH PROVIDER KEY, over
  // the SHIPPING `apnsKeyStore` and a P-256 key the probe generated this run.
  // Every reading is a boolean or a count; no key byte reaches this gate.
  // -------------------------------------------------------------------------
  const ap = live.apns;
  check(
    ap !== undefined && ap !== null && ap.absent !== true,
    `${TAG} RULE 23 CANNOT RUN: the probe gave no reading of apns-key.ts, so nothing proves the push provider key is sealed`
  );
  if (ap !== undefined && ap !== null && ap.absent !== true) {
    check(
      ap.keptOk === true && ap.digestEqual === true,
      `${TAG} THE PUSH PROVIDER KEY DID NOT ROUND TRIP: kept ${String(ap.keptOk)}, digest ${ap.digestEqual ? 'equal' : 'DIFFERENT'}`
    );
    check(
      ap.filePresent === true && ap.fileIsNotTheRecord === true && ap.fileHasNoArmour === true && ap.fileHoldsNoWindow === true,
      `${TAG} THE PUSH PROVIDER KEY IS ON DISK IN THE CLEAR: file ${String(ap.filePresent)}, not the record ${String(ap.fileIsNotTheRecord)}, no -----BEGIN ${String(ap.fileHasNoArmour)}, no 64 character window of the key ${String(ap.fileHoldsNoWindow)}`
    );
    check(
      ap.fileMode === 0o600 && ap.dirMode === 0o700,
      `${TAG} the push key's file has mode ${ap.fileMode === null ? 'none' : ap.fileMode.toString(8)} in a directory of mode ${ap.dirMode === null ? 'none' : ap.dirMode.toString(8)}, rather than 0600 in 0700`
    );
    check(
      ap.stagedLeft === false && ap.forgotten === true,
      `${TAG} the push key's store left its staged place (${String(ap.stagedLeft)}) or did not forget (${String(ap.forgotten)})`
    );
    check(
      ap.securityCalls === 0,
      `${TAG} KEEPING, READING OR FORGETTING THE PUSH KEY REACHED security ${String(ap.securityCalls)} time(s). The key is a sealed file and asks no keychain anything.`
    );
    check(
      ap.noSeal.ok === false &&
        ap.noSeal.reason === 'Nothing could be written, so nothing changed.' &&
        ap.noSeal.field === null &&
        ap.noSeal.filePresent === false &&
        ap.noSeal.stagedPresent === false,
      `${TAG} A SEAL THAT COULD NOT BE MADE did not keep nothing in the one write's own sentence: ${JSON.stringify(ap.noSeal)}`
    );
    check(
      ap.unopenReadsNull === true,
      `${TAG} a push key the seal cannot open was answered rather than read as absent`
    );
    check(
      ap.plantedReadsNull === true,
      `${TAG} A PLAINTEXT KEY PLANTED AT THE SLOT WAS ANSWERED. A file anything running as this user wrote is not a key Tortie kept, and the sender would sign with it.`
    );
    check(
      Array.isArray(ap.refusals) && ap.refusals.length === 6,
      `${TAG} the invalid-record arm drove ${String(ap.refusals?.length)} records rather than 6`
    );
    for (const r of ap.refusals ?? []) {
      check(
        r.refused === true && r.fieldNamed === true && r.nothingWritten === true,
        `${TAG} ${r.name} was not refused whole with its field named and nothing written: refused ${String(r.refused)}, field ${String(r.fieldNamed)}, nothing written ${String(r.nothingWritten)}`
      );
    }
    check(
      ap.filesScanned === true && ap.keyInAFile === false,
      `${TAG} RULE 9, WIDENED: a window of the push key was found in a file an arm left behind (scanned ${String(ap.filesScanned)})`
    );
    notes.push(
      'the push provider key round trips by sha256 through one sealed file, 0600 in 0700, never the record, no armour, no window, no security call; no seal keeps nothing, an unopenable or planted file reads null, 6 invalid records refused whole with the field named, and no file any arm left holds a window of the key'
    );
  }

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
// Rule 19 (Phase 220, item 2). THE DOMAIN HAS ONE SHUTDOWN OWNER.
//
// The runtime half is arm 12 of the probe, over the SHIPPING lifecycle, lock
// and watch modules. It spawns nothing: that the cancel really ends a
// `/usr/bin/security` is proved by the vitest file, which spawns a stand in
// that never exits, and this gate stays one that opens no process.
//
// The scanned half is here, and it is the half an ablation cannot reach:
// `../src/main/capabilities.ts` is not in the domain, so the copy the
// ablations run over does not carry it. Both scanners are proved on fixtures
// this file writes, of which several must make them fail.
// ---------------------------------------------------------------------------

if (!('error' in live)) {
  const life = live.lifecycle ?? { absent: true };
  check(
    life.absent !== true,
    `${TAG} the credentials domain carries no lifecycle.ts, so nothing owns its shutdown: at that commit the whole of this domain's quit is stopLoginsWatch()`
  );
  if (life.absent !== true) {
    check(
      life.openAtStart && life.begunClosesAdmission,
      `${TAG} admission does not close synchronously, so work can still be admitted while the quit runs`
    );
    check(
      life.trackedIdentity,
      `${TAG} trackCredentialWork does not hand back the promise it was given, so a caller cannot both own and cache one`
    );
    check(
      life.trackedCount === 1 && life.joinReportsTracked,
      `${TAG} accepted work is not owned, so the join has nothing to wait for`
    );
    check(
      life.joinReportsNotJoined,
      `${TAG} A JOIN THAT RAN OUT OF TIME REPORTED THAT IT JOINED, which is the one thing a shutdown report may never do`
    );
    check(
      life.childCounted && life.childAborted && life.childCountCleared,
      `${TAG} the join does not reach this domain's own security children`
    );
    check(
      life.secondIsAlready,
      `${TAG} a second join is not idempotent`
    );
    check(
      life.idle === '{"already":false,"tracked":0,"children":0,"joined":true,"waitedMs":0}',
      `${TAG} an idle quit is not immediate: it answered ${String(life.idle)}`
    );
    check(
      life.refusedForStop && life.lockNamedInRefusal,
      `${TAG} a lock waited for during a quit is not refused in a sentence naming the lock`
    );
    check(
      life.lockMadeNothing,
      `${TAG} A LOCK WAIT DURING A QUIT MADE A DIRECTORY, so the refusal is not before the mkdir and a lock could be taken while the domain is closing`
    );
    check(
      life.watchReadNothing && life.watchToldNobody,
      `${TAG} the watcher's own pass still reads every store after admission closes`
    );
  }
}

/** Does `security.ts` run its child through the guarded registry, cancellably? */
function securityIsGuarded(text) {
  const body = stripComments(text);
  if (/\bexecFile\s*\(/.test(body)) return false;
  if (!/\brunGuarded\s*\(/.test(body)) return false;
  return /cancel:\s*\w+\.signal/.test(body);
}
{
  const SECURITY_FIXTURES = [
    {
      name: 'guarded and cancellable',
      text: "const child = ownCredentialChild();\nconst run = await runGuarded(bin, line, { cancel: child.signal });\n",
      guarded: true
    },
    {
      name: 'the bare execFile this phase replaced',
      text: "const child = execFile(SECURITY_BIN, line, { timeout: 10 }, cb);\n",
      guarded: false
    },
    {
      name: 'guarded but with no cancel, so the disposer cannot reach it',
      text: "const run = await runGuarded(bin, line, { timeoutMs: 10 });\n",
      guarded: false
    },
    {
      name: 'the cancel only in a comment',
      text: "// cancel: child.signal\nconst run = await runGuarded(bin, line, { timeoutMs: 10 });\n",
      guarded: false
    }
  ];
  let behaved = 0;
  for (const f of SECURITY_FIXTURES) {
    if (securityIsGuarded(f.text) === f.guarded) behaved += 1;
    else failures.push(`${TAG} the security scanner misread the fixture "${f.name}"`);
  }
  notes.push(`${String(behaved)} of ${String(SECURITY_FIXTURES.length)} security fixtures behaved`);
}
check(
  securityIsGuarded(readFileSync(join(DOMAIN, 'security.ts'), 'utf8')),
  `${TAG} src/main/credentials/security.ts does not run its security child through runGuarded with a cancel, so neither the quit reap nor this domain's own disposer can reach it`
);

/**
 * Is the shutdown owner registered in the ordered disposer, and is admission
 * closed BEFORE the first await of it?
 *
 * Read from `disposeMainCapabilities`'s own braces, because a call in some
 * other function is not a call in this one, and the position is the rule: a
 * begin after the first await is a begin that let work in while the quit ran.
 */
function disposerRegistersTheOwner(text) {
  const body = functionBodyOf(stripComments(text), 'disposeMainCapabilities');
  if (body === null) return false;
  const begin = body.indexOf('beginCredentialShutdown(');
  const join = body.indexOf('joinCredentialShutdown(');
  if (begin < 0 || join < 0) return false;
  const firstAwait = body.indexOf('await ');
  if (firstAwait >= 0 && begin > firstAwait) return false;
  if (!/await\s+joinCredentialShutdown\s*\(/.test(body)) return false;
  // THE POSITION, ADDED BY THE FIX ROUND (Phase 220). The comment beside the
  // call in `capabilities.ts` says the join is where it is BECAUSE an observe
  // reaches the manifest through the live sessions seam and a write must settle
  // before the owner it asks is closed. Nothing checked that: moving the join
  // below `shutdownGmuxCore()` left this scanner green and every one of its six
  // fixtures behaving, so the load bearing half of the sentence was documented
  // rather than guarded. A body that shuts the core down at all must join first.
  const core = body.indexOf('shutdownGmuxCore(');
  return core < 0 || join < core;
}

{
  const DISPOSER_FIXTURES = [
    {
      name: 'registered, and admission closes before the first await',
      text: "export async function disposeMainCapabilities() {\n  beginCredentialShutdown();\n  stopLoginsWatch();\n  const r = await joinCredentialShutdown();\n  await other();\n}\n",
      ok: true
    },
    {
      name: 'not registered at all, which is the parent',
      text: "export async function disposeMainCapabilities() {\n  stopLoginsWatch();\n  await other();\n}\n",
      ok: false
    },
    {
      name: 'joined but never begun',
      text: "export async function disposeMainCapabilities() {\n  stopLoginsWatch();\n  const r = await joinCredentialShutdown();\n}\n",
      ok: false
    },
    {
      name: 'begun after the first await, so work was admitted while the quit ran',
      text: "export async function disposeMainCapabilities() {\n  await other();\n  beginCredentialShutdown();\n  const r = await joinCredentialShutdown();\n}\n",
      ok: false
    },
    {
      name: 'the join not awaited, so the disposer resolves while the domain runs',
      text: "export async function disposeMainCapabilities() {\n  beginCredentialShutdown();\n  void joinCredentialShutdown();\n  await other();\n}\n",
      ok: false
    },
    {
      name: 'joined before the core shuts down, which is the shipped order',
      text: "export async function disposeMainCapabilities() {\n  beginCredentialShutdown();\n  const r = await joinCredentialShutdown();\n  await shutdownGmuxCore();\n}\n",
      ok: true
    },
    {
      name: 'joined after the core shut down, so a write settles against a closed owner',
      text: "export async function disposeMainCapabilities() {\n  beginCredentialShutdown();\n  await shutdownGmuxCore();\n  const r = await joinCredentialShutdown();\n}\n",
      ok: false
    },
    {
      name: 'the core shut down inside a later try, still after the join',
      text: "export async function disposeMainCapabilities() {\n  beginCredentialShutdown();\n  const r = await joinCredentialShutdown();\n  try {\n    await shutdownGmuxCore();\n  } catch {}\n}\n",
      ok: true
    },
    {
      name: 'registered in some other function',
      text: "function elsewhere() {\n  beginCredentialShutdown();\n  return joinCredentialShutdown();\n}\nexport async function disposeMainCapabilities() {\n  await other();\n}\n",
      ok: false
    }
  ];
  let behaved = 0;
  for (const f of DISPOSER_FIXTURES) {
    if (disposerRegistersTheOwner(f.text) === f.ok) behaved += 1;
    else failures.push(`${TAG} the disposer scanner misread the fixture "${f.name}"`);
  }
  notes.push(`${String(behaved)} of ${String(DISPOSER_FIXTURES.length)} disposer fixtures behaved`);
}
check(
  disposerRegistersTheOwner(
    readFileSync(join(repoRoot, 'src/main/capabilities.ts'), 'utf8')
  ),
  `${TAG} disposeMainCapabilities does not close credential admission before its first await and await the join, so this domain has no owner in the ordered quit`
);

// ---------------------------------------------------------------------------
// The ablations. Each one must change the verdict.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  // -------------------------------------------------------------------------
  // PHASE 287, rule 21, AS PHASE 304 LEFT IT. Phase 287 wrote twelve clauses
  // with one ablation each; five of them (the default lift over an unkept
  // sign in, the row told, the own store's too-large arm, the grown login's
  // split, and the skip of the lift) ablated arms of keep.ts whose every fact
  // began in the VAULT write's refusal, and Phase 304 deleted those arms with
  // the case, so the ablations went with them. What stays is the vendor arm:
  // the cap in bytes, the runner's and the write's refusal ahead of the spawn,
  // the one write's named reason, the cap's value, and the default lift that
  // never un-chooses a login it could not reach, which is the one keep.ts arm
  // whose reason begins in the vendor write and which (g′) now drives.
  // -------------------------------------------------------------------------
  {
    name: 'the cap compared in UTF-16 units',
    edits: [
      {
        file: 'security.ts',
        from: "  return Buffer.byteLength(line, 'utf8') <= SECURITY_LINE_MAX_BYTES;",
        to: '  return line.length <= SECURITY_LINE_MAX_BYTES;'
      }
    ]
  },
  {
    name: 'the runner sends an -i line over the cap',
    edits: [
      {
        file: 'security.ts',
        from:
          "      if (argv[0] === '-i' && input !== undefined && !securityLineFits(input)) {\n" +
          "        return { code: 1, stdout: '', tooLong: true };\n" +
          '      }',
        to: ''
      }
    ]
  },
  {
    name: 'keychainWrite sends a line over the cap',
    edits: [
      {
        file: 'security.ts',
        from: '  if (!securityLineFits(command)) throw new CredentialTooLarge();\n',
        to: ''
      }
    ]
  },
  {
    name: 'the refusal flattened into false, so the reason has no name',
    edits: [
      {
        file: 'security.ts',
        from: '  if (!securityLineFits(command)) throw new CredentialTooLarge();',
        to: '  if (!securityLineFits(command)) return false;'
      }
    ]
  },
  {
    name: 'the one write forgets the reason',
    edits: [
      {
        file: 'swap.ts',
        from:
          '      if (err instanceof CredentialTooLarge) {\n' +
          "        return { ok: false, reason: LOGIN_TOO_LARGE_SENTENCE, why: 'too-large' };\n" +
          '      }\n' +
          "      return { ok: false, reason: 'Nothing could be written, so nothing changed.' };",
        to: "      return { ok: false, reason: 'Nothing could be written, so nothing changed.' };"
      }
    ]
  },
  {
    name: 'the cap raised past the measured buffer',
    edits: [
      {
        file: 'security.ts',
        from: 'export const SECURITY_LINE_MAX_BYTES = 4_000;',
        to: 'export const SECURITY_LINE_MAX_BYTES = 4_200;'
      }
    ]
  },
  {
    // The one keep.ts arm Phase 304 keeps, because its reason begins in the
    // VENDOR write: the default lift refused by the agent's own keychain entry
    // while the login's own store already holds the account. Rule 21 (g′)
    // drives it; without this arm the click answers the parent's `ok: false`
    // and the choice is not recorded.
    name: 'a too-large default lift un-chooses the login',
    edits: [
      {
        file: 'keep.ts',
        from: "    if (firstWhy === 'too-large') {",
        to: "    if (false && firstWhy === 'too-large') {"
      }
    ]
  },
  // -------------------------------------------------------------------------
  // PHASE 304, rule 22. Two ablations of the sealed vault, one per clause the
  // rule is made of: the seal dropped, so the file IS the payload, and a size
  // cap put back into Tortie's own store, so the 4,193 byte round trip is
  // refused the way every observe of his own codex store was refused from
  // Phase 204 to Phase 303.
  // -------------------------------------------------------------------------
  {
    name: 'the seal dropped, so the sealed file holds the payload in the clear',
    edits: [
      {
        file: 'vault.ts',
        from: '    writeNoFollowSync(writing, sealed);',
        to: '    writeNoFollowSync(writing, payload);'
      }
    ]
  },
  // -------------------------------------------------------------------------
  // PHASE 314, rule 23. Two ablations of the push provider key's store, one
  // per clause: the seal it hands the vault replaced by one that seals
  // nothing, so the file IS the key; and the read taken past the seal, so a
  // plaintext key planted at the slot is answered. Each must move rule 23's
  // own reading, driven or scanned, and not merely something else.
  // -------------------------------------------------------------------------
  {
    name: 'the push key store handed a seal that seals nothing, so the file equals the key',
    owns: ['apns', 'apnsSource'],
    edits: [
      {
        file: 'apns-key.ts',
        from: '  const backend = sealedVault(dir, seal, NO_LEGACY);',
        to: '  const backend = sealedVault(dir, { wrap: (t: string) => t, open: (b: string) => b }, NO_LEGACY);'
      }
    ]
  },
  {
    name: 'the push key read past the seal, so a planted plaintext key is sent with',
    owns: ['apns', 'apnsSource'],
    edits: [
      {
        file: 'apns-key.ts',
        from: '    const text = await backend.get(APNS_KEY_SLOT);',
        to: "    const text = (await import('node:fs')).readFileSync(`${dir}/${APNS_KEY_SLOT}.cred`, 'utf8');"
      }
    ]
  },
  {
    name: "a size cap put back into Tortie's own store",
    edits: [
      {
        file: 'vault.ts',
        from: '    const sealed = seal.wrap(payload);',
        to:
          "    if (Buffer.byteLength(payload, 'utf8') > 4_000) throw new Error('too large');\n" +
          '    const sealed = seal.wrap(payload);'
      }
    ]
  },
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
        from: '  if (before !== undefined && !sameAccountProven(before, reading)) {',
        to: '  if (false && before !== undefined) {'
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
        from: '  if (before !== undefined && !sameAccountProven(before, reading)) {',
        to: '  if (before !== undefined && before.email !== null && reading.email !== null && before.email !== reading.email) {'
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
        from: '    if (sameAccountProven(row, before)) {',
        to: '    if (false) {'
      }
    ]
  },
  {
    // PHASE 206. The vendor's own store taken out of the removal, which is the
    // defect exactly: the folder and the row went and the scoped keychain item
    // stayed, holding a whole credential nobody could reach.
    name: 'the vendor store left out of a removal, so its keychain item survives',
    edits: [
      {
        file: 'keep.ts',
        from:
          '  await forgetStore(d.stores, provider, loginDirIn(d.root, provider, id));',
        to: '  await Promise.resolve();'
      }
    ]
  },
  {
    // PHASE 206. The stray finisher taken out, which is the tree before this
    // phase: a removal an earlier run did not finish is never finished.
    name: 'the stray finisher removed, so a half done removal stays half done',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (removeStrayLoginDir(d.root, provider, id)) done.push(id);',
        to: '    if (false) done.push(id);'
      }
    ]
  },
  {
    // PHASE 206. The vault half of the sweep taken out, which is the tree
    // before this phase: `sweepStaged` reached the vendor stores and never the
    // store Tortie owns.
    name: 'the vault left out of the sweep, so a crash keeps a credential at <slot>.pending',
    edits: [
      {
        file: 'keep.ts',
        from: '    await vaultDiscardStaged(d.vault, slot);',
        to: '    await Promise.resolve();'
      }
    ]
  },
  {
    // PHASE 206 FIX ROUND. The sweep put back on `storesOf` alone, which drops
    // a login whose folder is not on disk, so a staged place beside a slot
    // whose directory has already gone is kept for ever. The record file half
    // is left in place on purpose, because the residue this arm plants is a
    // crash between the STAGE and the record row's own write, so there is no
    // row to find it by and the rows index is the only thing that reaches it.
    name: 'the sweep reading directories alone, so a slot with no folder keeps its residue',
    edits: [
      {
        file: 'keep.ts',
        from: '  for (const row of readLoginsFile(root).file.logins) {',
        to: "  for (const row of storesOf(root, provider).map((s) => ({ provider, id: s.id ?? 'default' }))) {"
      }
    ]
  },
  {
    // PHASE 206 FIX ROUND. The stray finisher put back on the `readdir` alone,
    // so a stray whose folder has gone while its slot, its row and its scoped
    // vendor item are all still there is never finished.
    name: 'the stray finisher reading directories alone, so a stray with no folder is never finished',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (id === DEFAULT_SLOT_ID || known.has(id)) continue;',
        to: '    if (true) continue;'
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
    // The staged write made to follow a link again, which is the shape the
    // whole of `nofollow.ts` exists for. Both halves go, because either one
    // alone still refuses: the unlink acts on the link rather than on what it
    // points at, and O_EXCL refuses a path that exists.
    name: 'the staged write made to follow a link again',
    edits: [
      {
        file: 'nofollow.ts',
        from: '  try {\n    unlinkSync(path);\n  } catch {',
        to: '  try {\n    if (false) unlinkSync(path);\n  } catch {'
      },
      {
        file: 'nofollow.ts',
        from: '    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL,',
        to: '    constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC,'
      }
    ]
  },
  {
    // The commit asked the same question, for a link planted AFTER the write.
    name: 'the commit no longer refuses to rename a link onto a store',
    edits: [
      {
        file: 'nofollow.ts',
        from: '  if (lstatSync(from).isSymbolicLink()) {',
        to: '  if (false) {'
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
    // PHASE 287 RE-ANCHORED IT, and the point of the ablation did not move: no
    // payload reaches a command line. Its `from` named the `.length` comparison
    // Phase 281.1 wrote, which this phase replaced with `securityLineFits`, and
    // an unmatched `from` is a gate failure rather than a red ablation. The `to`
    // keeps `answer` bound, so the two lines below the edit still read something
    // that exists and the copy fails the rule rather than failing to run.
    name: 'the payload put on a command line the way orca does it',
    edits: [
      {
        file: 'security.ts',
        from:
          '  const command = `add-generic-password -U -a "${account}" -s "${service}" -X "${hex}"\\n`;\n' +
          '  if (!securityLineFits(command)) throw new CredentialTooLarge();\n' +
          "  const answer = await runner.run(['-i'], command);",
        to:
          "  const answer = await runner.run([\n" +
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
    // PHASE 211. The default lift removed, so a session on the default login
    // never has the vendor's own location written and cannot follow a switch.
    name: 'the default lift removed, so a running default session never follows',
    edits: [
      {
        file: 'keep.ts',
        from: '      evidence.sessions.some(\n        (s) => s.provider === provider && isDefaultLogin(s.login)\n      )',
        to: '      false &&\n      evidence.sessions.some(\n        (s) => s.provider === provider && isDefaultLogin(s.login)\n      )'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The promotion in front of the default lift trusted
    // again, which is the shape that shipped: alice is written over while the
    // vendor's identity file still names her, and the next observe keeps bob
    // under her name.
    name: 'the default lift no longer keeps the account it writes over',
    edits: [
      {
        file: 'keep.ts',
        from: '          const promoted = await promoteOutgoing(d, provider, slot, before, kept, changed);\n          if (!promoted.held) {',
        to: '          const promoted = { held: true };\n          if (!promoted.held) {'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The default record left behind the store after the
    // lift, so the observe that follows judges a change under a stale identity.
    name: 'the default record not moved on after the lift',
    edits: [
      {
        file: 'keep.ts',
        from: '        const copy = await vaultPut(d.vault, slot, payload);\n        if (copy.ok) {',
        to: '        const copy = { ok: false };\n        if (copy.ok) {'
      }
    ]
  },
  {
    // COMMITTER'S ROUND OF PHASE 211, the verifier's F1. The store read
    // BEFORE the locks are taken, which is the shape the fix round shipped: a
    // refresh the vendor saves while the lift waits for the lock is written
    // over after the release, and the refreshed bytes exist nowhere.
    name: 'the store read before the locks are taken, so a refresh under the wait is lost',
    edits: [
      {
        file: 'keep.ts',
        from: '    const held = await takeLocksOrRefuse(provider, home, d.lockDeps);\n    if (!held.ok) return held;\n    try {\n      const live = await readSettledStore(d.stores, provider, store.dir);',
        to: '    const live = await readSettledStore(d.stores, provider, store.dir);\n    const held = await takeLocksOrRefuse(provider, home, d.lockDeps);\n    if (!held.ok) return held;\n    try {'
      }
    ]
  },
  {
    // COMMITTER'S ROUND OF PHASE 211, the verifier's F2. A held copy of the
    // same account answered held without being brought up to the newer
    // bytes, so the round trip work, alice, work put the pre refresh token back.
    name: 'a held copy of the same account not brought up to the newer bytes',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (sameAccountProven(row, before)) {\n      return freshenHeld(d, other, row, before, payload, kept, changed);\n    }',
        to: '    if (sameAccountProven(row, before)) {\n      return { held: true, event: null };\n    }'
      }
    ]
  },
  {
    // COMMITTER'S ROUND OF PHASE 211, the same finding from the other side:
    // the observe mirrors the stale store straight back over the fresher
    // slot, which is what made a slot only freshen worthless.
    name: 'the observe mirrors the digest a slot moved past',
    edits: [
      {
        file: 'keep.ts',
        from: '  if (before !== undefined && (before.superseded ?? null) === digest) {',
        to: '  if (false) {'
      }
    ]
  },
  {
    // COMMITTER'S ROUND OF PHASE 211, the verifier's F3. The promotion in
    // front of the default lift skipped when the store reads as empty or as
    // not a credential, so the rolling copy moves on over the only copy.
    name: 'the default promotion skipped when the store reads as no credential',
    edits: [
      {
        file: 'keep.ts',
        from: '        const before: KeptRecord | undefined = kept.slots[slot];\n        if (before !== undefined) {',
        to: '        const before: KeptRecord | undefined = kept.slots[slot];\n        if (holds !== null && before !== undefined) {'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The catch that turns a held lock into a refusal
    // removed, which is the shape that shipped: `LockHeld` leaves activate.
    name: 'a held lock thrown out of activate rather than refused',
    edits: [
      {
        file: 'keep.ts',
        from: '    if (err instanceof LockHeld) return { ok: false, reason: err.message };',
        to: '    if (err instanceof LockHeld) throw err;'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. An unmakeable lock waited on rather than refused,
    // which with the sleep below removed as well is the shape that spun a
    // core for the whole wait.
    name: 'an unmakeable lock waited on for the whole timeout',
    edits: [
      {
        file: 'locks.ts',
        from: "      throw new LockHeld(opts.lockName, 'unwritable');",
        to: '      made = false;'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The sleep on the null branch removed, so a seam
    // answering not made and not there together spins the loop.
    name: 'the lock loop null branch spinning with no sleep',
    edits: [
      {
        file: 'locks.ts',
        from: '      await deps.sleep(50);\n      continue;\n    }\n    if (deps.now() - heldAt > staleness) {',
        to: '      continue;\n    }\n    if (deps.now() - heldAt > staleness) {'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The watcher's refresh made a no-op once anything is
    // watched, which is the shape that shipped: targets derived once at start.
    name: 'the watcher targets derived once, so a login made later is never watched',
    edits: [
      {
        file: 'watch.ts',
        from: '  function refresh(): void {\n    if (stopped) return;',
        to: '  function refresh(): void {\n    if (stopped || watchers.size > 0) return;'
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The fingerprint reading the account alone, which
    // the vendor never changes on a sign in. Re-anchored in Phase 281, when the
    // loop over a service list became one return over the one name.
    name: 'the keychain fingerprint reading the account attribute alone',
    edits: [
      {
        file: 'watch.ts',
        from: "  return `${service}=${found ?? ''}@${modified ?? ''}`;",
        to: "  return `${service}=${found ?? ''}`;"
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The read made to follow a link again.
    name: 'the store read made to follow a link',
    edits: [
      {
        file: 'nofollow.ts',
        from: '    fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));',
        to: '    fd = openSync(path, constants.O_RDONLY);'
      }
    ]
  },
  {
    // PHASE 211. A live lock stolen, which is the one thing the protocol must
    // never do: a stolen lock is a write inside a token refresh.
    name: 'a live lock stolen, so a switch can land inside a token refresh',
    edits: [
      {
        file: 'locks.ts',
        from: '    if (deps.now() - heldAt > staleness) {',
        to: '    if (true) {'
      }
    ]
  },
  {
    // PHASE 211. A stale lock never reclaimed, so a dead holder blocks a switch
    // for ever.
    name: 'a stale lock never reclaimed, so a dead holder blocks a switch',
    edits: [
      {
        file: 'locks.ts',
        from: '    if (deps.now() - heldAt > staleness) {',
        to: '    if (false) {'
      }
    ]
  },
  {
    // PHASE 211. The claude write no longer held under the locks, so it can
    // race the vendor's own token refresh.
    name: 'the claude write no longer held under the locks',
    edits: [
      {
        file: 'locks.ts',
        from: "  if (provider === 'claude') return takeClaudeCredentialLocks(configHome, deps);",
        to: "  if (false && provider === 'claude') return takeClaudeCredentialLocks(configHome, deps);"
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The storage write lock dropped, so a commit can land
    // inside the vendor's own read modify write of the credential.
    name: 'the storage write lock not taken',
    edits: [
      {
        file: 'locks.ts',
        from: "  return join(configHome, '.storage-write');",
        to: "  return join(configHome, '.storage-writeX');"
      }
    ]
  },
  {
    // PHASE 211 FIX ROUND. The legacy lock named from the link rather than
    // the real path, which for a linked config home is not the vendor's lock.
    name: 'the legacy lock named from the link rather than the real path',
    edits: [
      {
        file: 'locks.ts',
        from: '    real = realpathSync(configHome);',
        to: '    real = configHome;'
      }
    ]
  },
  {
    // PHASE 211. The legacy lock named wrong, so the two locks are not the
    // vendor's pair.
    name: 'the legacy claude lock named wrong, so the pair is not the vendor\'s',
    edits: [
      {
        file: 'locks.ts',
        from: '  return `${real}.lock`;',
        to: '  return `${real}X.lock`;'
      }
    ]
  },
  {
    // PHASE 211. The watcher runs on every event, so a burst is not collapsed.
    name: 'the watcher debounce guard removed, so a burst is not collapsed',
    edits: [
      {
        file: 'watch.ts',
        from: '    if (timer !== null || running) return;',
        to: '    if (running) return;'
      }
    ]
  },
  {
    // PHASE 211. The watcher's file filter removed, so any change triggers it.
    name: 'the watcher file filter removed, so it observes for any file',
    edits: [
      {
        file: 'watch.ts',
        from: '          if (file === null || file === target.file) schedule();',
        to: '          schedule();'
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
    // PHASE 281. This was "the item account attribute no longer preserved on a
    // write back", and Phase 281 made preserving it the defect: the parent's
    // storeTarget copied the account of the first item the name matched, then
    // of the person's own item, then took the user name, and research 126 §8.10
    // drove it committing `add -U -a "unknown"` onto the stray's account. The
    // mistake a later round would make is that code put back, so that is the
    // ablation. With security.ts's refusal in place the two lookups by service
    // alone are refused and the copy falls through to the user name, which is
    // not the vendor rule's account when `USER` is set; the ablation after
    // the next one removes the refusal too and lands on the stray itself.
    name: 'the account copied again from the existing item in storeTarget',
    edits: [
      {
        file: 'stores.ts',
        from: 'import {\n  keychainDelete,\n  keychainRead,',
        to: 'import {\n  keychainAccount,\n  keychainDelete,\n  keychainRead,'
      },
      {
        file: 'stores.ts',
        from:
          '  const { account } = claudeStoreAddress(d, dir);\n' +
          '  return keychainTarget(d, claudeWriteService(dir), account);',
        to:
          '  const service = claudeWriteService(dir);\n' +
          '  const existing = await keychainAccount(d.runner, service, null);\n' +
          '  const own =\n' +
          '    existing ??\n' +
          '    (await keychainAccount(d.runner, claudeKeychainService(d.env, null), null)) ??\n' +
          '    d.userName;\n' +
          '  return keychainTarget(d, service, own);'
      }
    ]
  },
  {
    // PHASE 208. The digest dropped from the name, which is the tree before
    // that phase: every profile on the machine composes one item.
    name: 'the profile digest dropped from the keychain name',
    edits: [
      {
        file: 'vault.ts',
        from: '  return `${VAULT_SERVICE_PREFIX}${slot}-${vaultScopeDigest(scope)}`;',
        to: '  return `${VAULT_SERVICE_PREFIX}${slot}`;'
      }
    ]
  },
  {
    // PHASE 208. The migration refusal removed, so a scratch profile reads and
    // deletes the item every profile can reach.
    name: 'the migration made to run in any profile',
    edits: [
      {
        file: 'migrate.ts',
        from: "  if (d.ownProfile !== 'own') {",
        to: '  if (false) {'
      }
    ]
  },
  {
    // PHASE 208. The harness half of the profile proof removed, so a probe
    // launch in the person own profile directory would pass as his.
    name: 'a harness launch read as the person own profile',
    edits: [
      {
        file: 'migrate.ts',
        from: "  if (isHarnessLaunch(shape.env)) return 'harness';",
        to: ''
      }
    ]
  },
  {
    // PHASE 219, item 4a. The real path fallback taken out, which is the
    // finding: a home behind a symbolic link is refused the migration for
    // ever and the only trace is `refused: true` in a log line.
    name: 'the real path fallback taken out, so a home behind a link is refused for ever',
    edits: [
      {
        file: 'migrate.ts',
        from: "    if (realpathSync(here) === realpathSync(own)) return 'own';",
        to: ''
      }
    ]
  },
  {
    // PHASE 219, item 4a's other half. The reason dropped, so every refusal
    // reads alike: not macOS, a probe, and a home behind a link.
    name: 'the refusal reason dropped, so a log line cannot say which refusal it was',
    edits: [
      {
        file: 'migrate.ts',
        from: '    out.reason = d.ownProfile;',
        to: ''
      }
    ]
  },
  {
    // PHASE 219, item 4b. The delete's answer discarded, which is exactly the
    // shape that shipped: a runner refusing all six left `deleted: 2` and both
    // items on the machine.
    name: 'a delete counted whether or not security did it',
    edits: [
      {
        file: 'security.ts',
        from: "  const { code } = await runner.run(['delete-generic-password', ...address]);\n  return code === 0;",
        to: "  await runner.run(['delete-generic-password', ...address]);\n  return true;"
      }
    ]
  },
  {
    // PHASE 208. The record consulted no more, so a stale scoped copy wins
    // over the old item the profile actually recorded.
    name: 'the record no longer consulted when both names hold something',
    edits: [
      {
        file: 'migrate.ts',
        from: '        rewrite = true;',
        to: '        rewrite = false;'
      }
    ]
  },
  {
    // PHASE 208. The old item deleted before the scoped one is proved.
    name: 'the old item deleted without the scoped one read back',
    edits: [
      {
        file: 'migrate.ts',
        from: '    if (proof === null || (rewrite && proof !== held)) {',
        to: '    if (false) {'
      }
    ]
  },
  {
    // PHASE 304, THE FIX ROUND. The fourth shape's guard removed, which is the
    // sweep as the build round shipped it: a scoped item whose bytes differ
    // from the sealed file's, with the record naming neither, was deleted, so
    // its bytes were left nowhere. Rule 17e's unprovenTwin clause owns it.
    name: 'the sweep deleting a scoped item the record does not name beside a file it does not name either',
    edits: [
      {
        file: 'migrate.ts',
        from: '        } else if (twin !== sealed && !recordNames(record, sealed)) {',
        to: '        } else if (false) {'
      }
    ]
  },
  {
    // PHASE 220, item 1. The permissive catch restored, which is the shape that
    // shipped: an answer that could not be had becomes an empty list, the
    // default lift is skipped in silence, and the sentence the person reads is
    // the one a switch that worked prints.
    name: 'an unavailable session answer read as no sessions',
    edits: [
      {
        file: 'keep.ts',
        from: '  const evidence = await liveSessionEvidence(d);\n  if (!evidence.known) {',
        to: '  const evidence = { known: true as const, sessions: await d.liveSessions().catch((): LiveSession[] => []) };\n  if (false) {'
      }
    ]
  },
  {
    // PHASE 220, item 1. The classification of an unclassified throw removed,
    // so it leaves activateLogin uncaught for a caller to guess at, which is
    // what the registrar did.
    name: 'an unclassified activation throw left uncaught',
    edits: [
      {
        file: 'keep.ts',
        from: '  } catch {\n    // AN UNCLASSIFIED THROW IS NOT A SUCCESSFUL SWITCH (Phase 220).',
        to: '  } catch (thrown) {\n    throw thrown;\n    // AN UNCLASSIFIED THROW IS NOT A SUCCESSFUL SWITCH (Phase 220).'
      }
    ]
  },
  {
    // PHASE 220, item 2. Admission never closes, so every entry point goes on
    // admitting work while the quit runs.
    name: 'admission never closes',
    edits: [
      {
        file: 'lifecycle.ts',
        from: 'export function beginCredentialShutdown(): void {\n  open = false;\n}',
        to: 'export function beginCredentialShutdown(): void {\n  open = open;\n}'
      },
      {
        file: 'lifecycle.ts',
        from: '  // ADMISSION CLOSES HERE TOO, so a caller that reaches the join without the\n  // disposer\'s first line still cannot admit work while it runs.\n  open = false;',
        to: '  // ADMISSION CLOSES HERE TOO, so a caller that reaches the join without the\n  // disposer\'s first line still cannot admit work while it runs.'
      }
    ]
  },
  {
    // PHASE 220, item 2. Accepted work is not owned, so the join has nothing to
    // wait for and resolves while a pass is still reading stores.
    name: 'accepted work not owned',
    edits: [
      {
        file: 'lifecycle.ts',
        from: '  tracked.add(held);',
        to: '  if (held === undefined) tracked.add(held);'
      }
    ]
  },
  {
    // PHASE 220, item 2. The cancel never reaches this domain's own children,
    // which is the shape the bare execFile had.
    name: 'the security children not cancelled by the join',
    edits: [
      {
        file: 'lifecycle.ts',
        from: '  for (const one of children) {\n    one.abort();\n    ended += 1;\n  }',
        to: '  for (const one of children) {\n    ended += 1;\n  }'
      }
    ]
  },
  {
    // PHASE 220, item 2. The lock wait is not cancelled, so a quit waits nine
    // seconds per lock for a lock it is not going to use.
    name: 'the lock wait not cancelled',
    edits: [
      {
        file: 'locks.ts',
        from: "    if (deps.cancelled?.() === true) throw new LockHeld(opts.lockName, 'stopped');",
        to: "    if (false) throw new LockHeld(opts.lockName, 'stopped');"
      }
    ]
  },
  {
    // PHASE 220, item 2. The watcher's own pass walks every store during the
    // quit, which is the pass nothing owned at the parent.
    name: "the watcher's pass not refused after shutdown",
    edits: [
      {
        file: 'watch.ts',
        from: '    if (running || stopped || !credentialsAreOpen()) return;',
        to: '    if (running || stopped) return;'
      }
    ]
  },
  {
    // PHASE 281, rule 20a. readStore's read made without the account, which is
    // the parent's lookup by service alone. security.ts refuses it, so the
    // vendor item is never read at all.
    name: "the account dropped at readStore's read",
    edits: [
      {
        file: 'stores.ts',
        from: '    const found = await safeKeychain(d, service, account);',
        to: '    const found = await safeKeychain(d, service, null);'
      }
    ]
  },
  {
    // PHASE 281, rule 20a. forgetStore's delete of the login's own item made
    // without the account, which by service alone removes the first item of
    // the name, whoever's it is.
    name: "the account dropped at forgetStore's delete",
    edits: [
      {
        file: 'stores.ts',
        from: '  await keychainDelete(d.runner, service, account);\n  // The staged place',
        to: '  await keychainDelete(d.runner, service, null);\n  // The staged place'
      }
    ]
  },
  {
    // PHASE 281, rule 20c. The refusal taken out of security.ts's one address
    // helper, so a vendor name with no account sends `-s` alone again.
    name: "security.ts's refusal of a vendor name with no account removed",
    edits: [
      {
        file: 'security.ts',
        from: "    return isClaudeVendorService(service) ? null : ['-s', service];",
        to: "    return ['-s', service];"
      }
    ]
  },
  {
    // PHASE 281, rule 20d with the refusal gone as well: the parent's copying
    // storeTarget over a security.ts that no longer refuses, which is exactly
    // the shape research 126 §8.10 drove. The service-only lookup of the plain
    // name lands on the stray placed first and the commit goes under its
    // account.
    name: "the refusal removed and the account copied again, research 126 §8.10's shape",
    edits: [
      {
        file: 'security.ts',
        from: "    return isClaudeVendorService(service) ? null : ['-s', service];",
        to: "    return ['-s', service];"
      },
      {
        file: 'stores.ts',
        from: 'import {\n  keychainDelete,\n  keychainRead,',
        to: 'import {\n  keychainAccount,\n  keychainDelete,\n  keychainRead,'
      },
      {
        file: 'stores.ts',
        from:
          '  const { account } = claudeStoreAddress(d, dir);\n' +
          '  return keychainTarget(d, claudeWriteService(dir), account);',
        to:
          '  const service = claudeWriteService(dir);\n' +
          '  const existing = await keychainAccount(d.runner, service, null);\n' +
          '  const own =\n' +
          '    existing ??\n' +
          '    (await keychainAccount(d.runner, claudeKeychainService(d.env, null), null)) ??\n' +
          '    d.userName;\n' +
          '  return keychainTarget(d, service, own);'
      }
    ]
  },
  {
    // PHASE 281, rule 20a. The backstop made one attribute read by service
    // alone, straight through the runner, which is the parent's fingerprint in
    // one call: it reads whichever item `security` meets first.
    name: 'the keychain fingerprint made a service-only attribute read',
    edits: [
      {
        file: 'watch.ts',
        from:
          '  const found = await keychainAccount(stores.runner, service, account);\n' +
          '  const modified = await keychainModified(stores.runner, service, account);',
        to:
          "  const listed = (await stores.runner.run(['find-generic-password', '-s', service])).stdout;\n" +
          '  const found = /"acct"<blob>="([^"\\n]*)"/.exec(listed)?.[1] ?? null;\n' +
          '  const modified = /"mdat"<timedate>=0x[0-9A-Fa-f]+\\s+"([^"\\n]*)"/.exec(listed)?.[1] ?? null;'
      }
    ]
  },
  {
    // PHASE 281, rule 20b. A NEW vendor keychain call that no arm drives, and
    // with no account. Every probe reading stays where it was, because nothing
    // calls it, and security.ts would refuse it at run time anyway. It is the
    // source rule's own ablation: the half of rule 20 a probe cannot give.
    name: 'a new vendor keychain read with no account, which no arm drives',
    edits: [
      {
        file: 'stores.ts',
        from: '/** Read a store once. */\nexport async function readStore(',
        to:
          'export async function peekStore(d: StoreDeps, dir: string): Promise<string | null> {\n' +
          '  return keychainRead(d.runner, claudeWriteService(dir), null);\n' +
          '}\n\n' +
          '/** Read a store once. */\nexport async function readStore('
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
  const liveSitesReading = JSON.stringify(liveSites);
  const liveLineCapReading = JSON.stringify(liveLineCap);
  const liveApnsReading = JSON.stringify(liveApns);
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
      if (!existsSync(target)) {
        // A FILE THE DOMAIN DOES NOT CARRY IS RULE 17's SHAPE, NOT A CRASH.
        // Every ablation above is a text edit, so a domain missing one of the
        // files they name used to throw a raw ENOENT out of this line and
        // ended the gate with a node stack and no rule named. That is exactly
        // what running this gate at Phase 208's parent did, and it is the
        // third Phase 208 finding (Phase 219, item 4c): a gate that dies is
        // not a gate that fails. The reading is a finding now, and the rule 17
        // arm below still runs and still names itself.
        //
        // The sentence deliberately does NOT spell rule 17's own words, which
        // are pinned further down by a regex over this file. A second copy of
        // that phrase here would keep that self check green with the real
        // sentence deleted, which is the guard weakening itself.
        failures.push(
          `${TAG} rule 17 has no ${edit.file} to ablate for "${ablation.name}", so this domain cannot run that clause`
        );
        applied = false;
        break;
      }
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
    // RULE 20b IS READ FROM SOURCE (Phase 281), so the ablated copy is scanned
    // as well as probed. A call site whose account stopped being the vendor
    // rule's moves this reading even where no world the probe builds can tell.
    if (JSON.stringify(vendorKeychainSites(dir)) !== liveSitesReading) {
      moved.push('vendorSites');
    }
    // RULE 21 (a) TO (c) ARE READ FROM SOURCE TOO (Phase 287), for the same
    // reason: the order of the refusal against the call count and against the
    // spawn is not something a world this gate builds can see.
    if (JSON.stringify(lineCapSites(dir)) !== liveLineCapReading) {
      moved.push('lineCapSource');
    }
    // RULE 23 IS READ FROM SOURCE TOO (Phase 314), so a key store that stops
    // being sealed moves this reading even if no world the probe builds shows it.
    if (JSON.stringify(apnsSites(dir)) !== liveApnsReading) {
      moved.push('apnsSource');
    }
    // AN ABLATION THAT NAMES THE READINGS IT OWNS must move one of THEM, so a
    // rule 23 arm that happened to move some other reading proves nothing about
    // rule 23 (Phase 314).
    if (ablation.owns !== undefined && !ablation.owns.some((o) => moved.includes(o))) {
      failures.push(
        `${TAG} the ablation "${ablation.name}" moved ${moved.join(', ') || 'nothing'} but none of ${ablation.owns.join(', ')}, the readings its rule owns`
      );
      continue;
    }
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
  // -------------------------------------------------------------------------
  // A DOMAIN WITH NO MIGRATION, and it is the third Phase 208 finding
  // (Phase 219, item 4c). Every ablation above is a TEXT EDIT, so none of them
  // can express the shape that actually broke this gate, which is a file that
  // is not there at all. The parent of Phase 208's own code is exactly that,
  // and running the gate at it printed a raw ERR_MODULE_NOT_FOUND wrapped as
  // "the probe did not run" with no rule named. A gate that dies is not a gate
  // that fails, so the missing file is staged here and the reading is read.
  // -------------------------------------------------------------------------
  {
    const dir = join(mainDir, `${ABLATION_PREFIX}absent`);
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(DOMAIN).filter((n) => n.endsWith('.ts'))) {
      if (f === 'migrate.ts') continue;
      cpSync(join(DOMAIN, f), join(dir, f));
    }
    const withoutMigrate = runProbe(dir);
    if ('error' in withoutMigrate) {
      failures.push(
        `${TAG} A DOMAIN WITH NO migrate.ts STOPPED THE PROBE RUNNING instead of naming rule 17: ${String(withoutMigrate.error).slice(0, 200)}`
      );
    } else if (withoutMigrate.scope?.absent !== true) {
      failures.push(
        `${TAG} a domain with no migrate.ts did not answer absent, so rule 17 cannot say why it could not run`
      );
    } else {
      // AND THE RULE MUST REALLY SAY SO. The gate's own sentence is composed
      // here from the same reading, so a later round that drops the check has
      // to drop this too.
      const said = /RULE 17 CANNOT RUN/.test(readFileSync(fileURLToPath(import.meta.url), 'utf8'));
      if (!said) {
        failures.push(`${TAG} rule 17 has no sentence for a domain with no migration`);
      }
      notes.push('a domain with no migrate.ts answers absent and rule 17 names itself');
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
