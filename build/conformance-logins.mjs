#!/usr/bin/env node
/**
 * `npm run conformance:logins`, the cheap gate on the logins domain
 * (Phase 202).
 *
 * About ten seconds since Phase 281, nearly all of it the probe, run once over
 * the tree, once over an unedited copy and once per ablation. It launches no
 * Electron, opens no window, starts no tmux server, spawns no agent, makes no
 * request, opens no keychain, never runs `/usr/bin/security`, and reads
 * nothing under the person's home: the only paths it touches are the
 * repository, the dot-named sibling copies it removes in a `finally`, and a
 * scratch directory it makes and removes. The only processes started below the
 * probe are the `/bin/sh` stand-ins for `security` it writes for rules 13 and
 * 16, each started and waited for by the shipping reader, and each exits at
 * once. Every runtime number it prints came from the SHIPPING modules, run
 * under node by build/logins-conformance-probe.mts.
 *
 * ## Why a gate rather than unit tests alone
 *
 * The unit tests prove the rules hold. This gate proves the rules are still
 * the ones that MATTER, and it does that in the two ways a unit test cannot.
 *
 *   - IT SCANS THE REAL SOURCE for the refusals. A refusal is a line somebody
 *     can delete, and deleting it breaks no unit test that was written before
 *     the deletion. The three scans below say what may not be in the source at
 *     all: the logins domain names no default credential location, reads no
 *     home directory, and calls a deletion API in exactly one place, inside a
 *     function that asks the ownership rule first.
 *   - IT GOES RED UNDER ABLATION. Every runtime rule is re-run over an ablated
 *     copy of the shipping store, and a rule that stays green under its own
 *     ablation is a rule that cannot fail, which proves nothing.
 *
 * ## The rules
 *
 *   1. THE DEFAULT LOGIN IS NEVER A WRITE TARGET, scanned over the shipping
 *      source. No file in the logins domain names `.claude`, `.codex`, a home
 *      directory, or `node:os`, so there is no expression anywhere in it that
 *      could compose a path to the person's own sign in. What it cannot name
 *      it cannot write to and cannot delete.
 *   2. TWO DELETIONS, BOTH GUARDED. `rmSync` appears in the domain exactly
 *      twice, and each function that holds one asks `isOwnedLoginDir` first,
 *      read by matching braces rather than by searching for the word anywhere
 *      in the file. Phase 206 added the second, being the one that finishes a
 *      removal an earlier run left half done; the count is pinned so a THIRD
 *      has to be argued for rather than added quietly.
 *   3. A DIRECTORY OUTSIDE THE OWNED ROOT IS REFUSED, over thirteen shapes an
 *      escape would be spelled as, including the other provider's tree, a
 *      parent traversal, an absolute path into somebody's home and the empty
 *      string. A hostile store file's rows are dropped WHOLE, its chosen name
 *      goes with them, and a directory it named survives untouched.
 *   3b. AND OVER A REAL LINK ON A REAL DISK, which is the shape none of the
 *      thirteen above can express, because every one of them is a SPELLED
 *      path and `resolve` does not follow a link. The Phase 202 verifier
 *      planted one in the running app and drove the shipped surfaces with it,
 *      so the probe now plants four, being the entry, the provider root, the
 *      logins root and a file where a folder should be, and reads back what
 *      the list, the choice, the resolver and the meter's own directory
 *      answer. A folder that is merely GONE must still read as absent rather
 *      than as an escape, or the fallback stops being honest.
 *   4. NO TOKEN BYTE reaches the manifest row or either argv, over a fixture
 *      credential holding a sentinel. The DIRECTORY does not reach them
 *      either: it is on the pane environment exactly once and nowhere else,
 *      which is what makes restore re-resolve a name rather than replay a
 *      path.
 *   5. THE CONFIRM HASH IS UNCHANGED BY A LOGIN CHOICE, measured over the real
 *      hash with a login chosen and a session composed under it, and the same
 *      hash is shown to MOVE when a variable is added to `launch.env`, so the
 *      first half is a measurement rather than a constant. `login` is not a
 *      key of the execution fields at all, which is the structural half.
 *   6. THE FALLBACK. A chosen login whose directory is gone resolves to the
 *      default and says which name it could not honour, so a restore never
 *      points a pane at a directory that is not there.
 *   7. The gate is named in package.json and in build/verification-checks.mjs,
 *      because a gate nothing names is how a gate decays.
 *
 * ## Phase 203 added three more, and they are the ones the operator reported
 *
 *   8. PRESENCE IS THE WHOLE QUESTION. A login whose credential exists only in
 *      the keychain reads as PRESENT, one with neither reads as absent, and a
 *      login is asked for the SCOPED service name and nothing else, so a
 *      second login can never read the person's own default credential. The
 *      scoped name is derived from the directory by the shipping function and
 *      re-derived here by a hash this file computes itself. The cheap file
 *      only list is shown to answer the opposite, because that opposite IS the
 *      defect: on macOS no `.credentials.json` is ever written, so every added
 *      claude login said `Not signed in yet` for ever. A folder that is GONE
 *      is never asked about, because a Remove leaves the scoped keychain item
 *      behind.
 *   9. THE ACCOUNT IS READ AND NO TOKEN BYTE IS KEPT. Claude and codex both
 *      answer an address, codex out of the id token's own email claim; a login
 *      that has taken no turn, a file that is not JSON and a field holding
 *      markup are all "not known" rather than a crash or a drawn string; a
 *      sentinel inside the codex token reaches nothing; and the DEFAULT claude
 *      account file is spelled apart from the default credential file, because
 *      `~/.claude/.claude.json` exists and holds no account.
 *  10. THE READER NEVER ASKS FOR A PAYLOAD AND NEVER LOGS. Scanned over the
 *      real source: `-w` is what makes `security` print the secret, and it
 *      appears nowhere; and the module writes no log line of any kind, so
 *      there is no line for an address or a token to reach.
 *
 * ## Phase 220 added one more, and it is the second defect that phase repaired
 *
 *  12. AN UNCLASSIFIED THROW IN `logins:choose` DOES NOT FALL THROUGH TO THE
 *      CHOICE. Measured at `b5cc017`: with `activateLogin` made to reject, the
 *      registered handler answered `ok: true` and `logins.json` recorded the
 *      new name, so a step that failed for a reason nobody classified was
 *      written down as a switch that worked. The catch is read out of the
 *      handler's OWN span by matching braces, because a return in another
 *      handler is not a return in this one, and the rule is about leaving
 *      rather than about the words in the sentence.
 *
 * ## Phase 281 added five, and the item they are about is the one Claude Code reads
 *
 * Research 126 §2.4 measured the defect: Tortie asked the keychain for Claude
 * Code's item by SERVICE alone, the operator's keychain held two items under
 * that name, and `security` handed back a stray under another account while
 * every claude session read the one under his user name. §5 read the vendor's
 * own rule out of the bundle, and it asks by service AND account, one name,
 * with no plain name after a scoped one.
 *
 *  13. THE ACCOUNT IS SENT, read from the source and driven. The presence
 *      check's argv and the meter's reader's argv each carry `-a` with the
 *      account parameter and `-s` with the service parameter, the presence
 *      argv still with no `-w`, both default seams hand the vendor rule the
 *      machine's user name, and both seam calls pass the account. Driven, the
 *      presence seam and the meter's seam are asked the one vendor name under
 *      the synthetic vendor account, a stray under the same name reads absent,
 *      and the SHIPPING `keychainReader` hands a program standing in for
 *      `security` exactly `-a <account> -s <service> -w` and refuses an empty
 *      account before anything is started.
 *  14. NO PLAIN NAME AFTER A SCOPED ONE, read from the source of both domains.
 *      No array, push sequence or revived `claudeServicesFor` names the plain
 *      vendor name after a scoped one, and `claudeKeychainService` answers
 *      exactly five arms, one per branch of the vendor rule, each exactly one
 *      name, the scoped ones hashing the login directory, then
 *      `CLAUDE_SECURESTORAGE_CONFIG_DIR`, then `CLAUDE_CONFIG_DIR`.
 *  15. BRANCH B ANSWERS MISSING, driven through the shipping
 *      `readClaudeCredential`: `CLAUDE_CONFIG_DIR` set, no scoped item, and a
 *      usable plain item under the stray account or under the vendor account
 *      itself, beside a control whose scoped item must still be found.
 *  16. A MISS IS NOT A FAILURE, driven through the shipping `keychainReader`
 *      over programs the probe writes and waits for: exit 44 is null, and 36,
 *      1 and a program that cannot start all throw, so the meter answers
 *      `missing` for 44 alone and throws for the rest unless the file stands in.
 *  17. A DECOMPOSED DIRECTORY NAMES THE COMPOSED ITEM, driven: every way a
 *      directory reaches a service name hashes its NFC form, re-derived here.
 *  18. THE NAMED EXCEPTION IS EXACTLY TWO ROWS (Phase 281.1). A chosen login
 *      under `CLAUDE_SECURESTORAGE_CONFIG_DIR` is the one class where Tortie
 *      and Claude Code's `mI` disagree: empty, the vendor reads the PLAIN
 *      item (the default account's credential) while Tortie names the login's
 *      scoped item; set, the vendor reads the variable's scoped item. With
 *      the variable equal to the login directory, or unset, they agree. The
 *      Phase 281 vendor verifier asked for this pin so the disagreement is
 *      executable and cannot widen in silence; the fix is `loginPaneEnv`
 *      setting the variable beside `CLAUDE_CONFIG_DIR` (SPEC §8), not built.
 *  19. THE CHOICE CARRIES ITS REASON, AND NO ROW CARRIES A SIZE (Phase 287,
 *      narrowed by Phase 304). A credential one `security -i` line cannot
 *      carry is refused before any spawn, and until Phase 287 nothing a person
 *      read said so. Phase 287 gave the ROW a field for it too, because
 *      Tortie's own keychain vault could refuse a keep; since Phase 304 that
 *      vault is a sealed file with no ceiling, so the only store that can
 *      refuse for size is the agent's own keychain entry, that refusal happens
 *      at a click and nowhere else, and the row field, its drawing rule and
 *      its label are gone with the case. Read from the `logins:choose`
 *      handler's own span by matching braces: the refusal return and the
 *      answered return each carry the reason from `put.why`, the answered one
 *      on BOTH arms of its ternary, because the arm with no activation
 *      sentence is exactly the switch that stood without writing anything and
 *      is the one this reason exists for. Scanned: the sentence's bytes appear
 *      in one non-test file under `src/`, being the words file, `swap.ts`
 *      names the constant and `keep.ts` no longer does, because every
 *      refusal that says it now begins in the vendor write `swap.ts` runs.
 *      Driven through the shipping `listLoginsAsking` over an ask that answers
 *      a size field anyway: no row carries one, the words file exports neither
 *      a drawing rule nor a label for one and names no such field in its
 *      code, and the two sentences that survive are read by value.
 *
 * AND IT REPAIRED THE ABLATIONS, which had proved nothing since Phase 200. The
 * copies went to the system temporary directory, where the usage copy's import
 * of `../proc/guarded` cannot resolve, so the probe died on import under EVERY
 * ablation and the verdict read `['error']`, which differs from the live one:
 * sixteen "red" ablations, all for the wrong reason. The copies are SIBLINGS
 * of `logins/` and `usage/` under `src/main/` now, named with a leading dot and
 * removed in a `finally`, the way build/conformance-credentials.mjs already
 * placed its own. An unedited copy must read exactly what the tree reads before
 * any ablation counts, a probe that cannot run is a FINDING rather than a red,
 * and the shipping files' sha256 is compared before and after.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  blockAt,
  callArguments,
  closeOf,
  functionBodyOf,
  namedFunctions,
  stripComments as stripCommentsExact
} from './scan-source.mjs';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[logins]';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOMAIN = join(repoRoot, 'src/main/logins');
/** Phase 203. The account reader, which is in the usage domain on purpose. */
const USAGE = join(repoRoot, 'src/main/usage');
const ACCOUNTS_FILE = join(USAGE, 'login-accounts.ts');
/** Phase 281. The meter's reader and the vendor copies. */
const CREDENTIALS_FILE = join(USAGE, 'credentials.ts');
/** Phase 281. The credential domain, which rule 14 reads beside the usage one. */
const CREDENTIALS_DOMAIN = join(repoRoot, 'src/main/credentials');
/** Phase 287. The words file every login surface draws from, which rule 19 reads. */
const SHARED = join(repoRoot, 'src/shared');

const failures = [];
const notes = [];
function check(ok, sentence) {
  if (!ok) failures.push(sentence);
}

// ---------------------------------------------------------------------------
// The scanners. Each is proved on fixtures this file writes, so a scan that
// cannot fail is never mistaken for a scan that passed.
// ---------------------------------------------------------------------------

/** Comment text removed, so a sentence about `.claude` is not a reference. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Rule 1's scanner. What a file must not be able to NAME.
 *
 * The four terms are the whole of how a default credential location could be
 * composed: the two vendor directory names, the home directory function, and
 * the environment variable that holds it. A domain that names none of them
 * cannot compose a path to the person's own sign in, whatever else it does.
 */
const FORBIDDEN = [
  { re: /['"`]\.claude/, why: "names the default claude directory" },
  { re: /['"`]\.codex/, why: "names the default codex directory" },
  { re: /\bhomedir\b/, why: 'reads a home directory' },
  { re: /\bnode:os\b/, why: 'imports node:os' },
  { re: /env\[['"`]HOME['"`]\]|env\.HOME\b/, why: 'reads $HOME' }
];

function namesADefaultLocation(text) {
  const body = stripComments(text);
  return FORBIDDEN.filter((f) => f.re.test(body)).map((f) => f.why);
}

/**
 * Rule 2's scanner. The one deletion, and the guard in front of it.
 *
 * It reads the function that holds the call by MATCHING BRACES from the
 * enclosing `function` keyword, rather than searching the file for the guard's
 * name, because a guard in some other function is not a guard on this one.
 */
function deletionsIn(text) {
  const body = stripComments(text);
  const out = [];
  const re = /\b(rmSync|rmdirSync|unlinkSync|rm|unlink|rmdir)\s*\(/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.push({ call: m[1], at: m.index, guarded: guardsThisCall(body, m.index) });
  }
  return out;
}

/** Does the function holding `at` ask the ownership rule before reaching it? */
function guardsThisCall(body, at) {
  const start = body.lastIndexOf('function ', at);
  if (start < 0) return false;
  const open = body.indexOf('{', start);
  if (open < 0 || open > at) return false;
  let depth = 0;
  let end = -1;
  for (let i = open; i < body.length; i++) {
    const ch = body[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < at) return false;
  return body.slice(open, at).includes('isOwnedLoginDir');
}

/**
 * Rule 10's scanners, over the account reader's real source.
 *
 * `-w` IS THE WHOLE POINT. `security find-generic-password -s <service>`
 * prints the item's attributes; the same call with `-w` prints the secret.
 * The reader answers presence and must therefore never carry that flag, and
 * this is the line somebody could add in one character.
 *
 * The second scan is the reason there is no line for an address to reach: the
 * module writes none at all.
 */
function asksForAPayload(text) {
  const body = stripComments(text);
  return /['"`]-w['"`]/.test(body) || /\bfind-generic-password\b[^;]*['"`]-w['"`]/.test(body);
}

function writesALog(text) {
  const body = stripComments(text);
  return /\bconsole\s*\.|\bgetLog\s*\(|\blog\s*\.(info|warn|error|debug)\s*\(/.test(
    body
  );
}

// ---------------------------------------------------------------------------
// Rule 1 and rule 2, over the real source.
// ---------------------------------------------------------------------------

const domainFiles = readdirSync(DOMAIN)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => join(DOMAIN, f));
check(domainFiles.length >= 5, `${TAG} the logins domain has fewer files than expected`);

let deletionCount = 0;
for (const file of domainFiles) {
  const text = readFileSync(file, 'utf8');
  const named = namesADefaultLocation(text);
  check(
    named.length === 0,
    `${TAG} ${file.slice(repoRoot.length + 1)} ${named.join(' and ')}, so it can compose a path to the person's own sign in`
  );
  for (const d of deletionsIn(text)) {
    deletionCount += 1;
    check(
      d.guarded,
      `${TAG} ${file.slice(repoRoot.length + 1)} calls ${d.call} in a function that does not ask isOwnedLoginDir first`
    );
  }
}
// PHASE 206 MOVED THIS NUMBER FROM ONE TO TWO, on purpose and in the same
// commit as the second call. `removeLogin` deletes the folder of a login the
// person removed; `removeStrayLoginDir` deletes the folder of one whose row is
// already gone, which is the whole of finishing a removal an earlier run left
// half done. Both are guarded by the rule above, which is the property that
// matters; the count is here so a THIRD one has to be argued for rather than
// added quietly.
check(
  deletionCount === 2,
  `${TAG} the logins domain holds ${String(deletionCount)} deletion calls; it must hold exactly two, being removeLogin and removeStrayLoginDir`
);
notes.push(
  `${String(domainFiles.length)} files scanned, ${String(deletionCount)} guarded deletion calls, none names a default location`
);

// Rule 10, over the account reader.
const accountsText = readFileSync(ACCOUNTS_FILE, 'utf8');
check(
  !asksForAPayload(accountsText),
  `${TAG} src/main/usage/login-accounts.ts hands security a -w, which prints the secret rather than the item`
);
check(
  !writesALog(accountsText),
  `${TAG} src/main/usage/login-accounts.ts writes a log line, so an address or a token has somewhere to land`
);
// AND THE DOMAIN STILL CANNOT NAME A DEFAULT LOCATION, which is why the
// reader is over here at all. Rule 1 above already asserts it file by file;
// this names the reason in the failure sentence.
check(
  namesADefaultLocation(accountsText).length > 0,
  `${TAG} src/main/usage/login-accounts.ts names no vendor location at all, so it is not the file rule 1 sent out of the logins domain and this gate is checking the wrong thing`
);

// ---------------------------------------------------------------------------
// The scanners, proved on fixtures. Two must pass and four must fail.
// ---------------------------------------------------------------------------

const fixtureRoot = mkdtempSync(join(tmpdir(), 'p202-fixtures-'));
try {
  const FIXTURES = [
    {
      name: 'a clean module',
      text: "import { join } from 'node:path';\nexport function f(root: string) { return join(root, 'x'); }\n",
      names: false,
      deletionUnguarded: false
    },
    {
      name: 'a comment that merely mentions the default',
      text: "// This never writes ~/.claude or homedir().\nexport const a = 1;\n",
      names: false,
      deletionUnguarded: false
    },
    {
      name: 'a module that joins the home directory',
      text: "import { homedir } from 'node:os';\nexport const p = homedir();\n",
      names: true,
      deletionUnguarded: false
    },
    {
      name: 'a module that names the default claude directory',
      text: "export const p = join(root, '.claude');\n",
      names: true,
      deletionUnguarded: false
    },
    {
      name: 'a deletion with no guard',
      text: "export function remove(dir: string) { rmSync(dir, { recursive: true }); }\n",
      names: false,
      deletionUnguarded: true
    },
    {
      name: 'a deletion guarded in ANOTHER function',
      text:
        "export function check(d: string) { return isOwnedLoginDir(r, p, d); }\n" +
        "export function remove(dir: string) { rmSync(dir, { recursive: true }); }\n",
      names: false,
      deletionUnguarded: true
    },
    {
      name: 'a deletion guarded in its own function',
      text:
        "export function remove(root: string, p: string, dir: string) {\n" +
        "  if (!isOwnedLoginDir(root, p, dir)) return false;\n" +
        "  rmSync(dir, { recursive: true });\n  return true;\n}\n",
      names: false,
      deletionUnguarded: false
    }
  ];
  let behaved = 0;
  for (const f of FIXTURES) {
    const named = namesADefaultLocation(f.text).length > 0;
    const unguarded = deletionsIn(f.text).some((d) => !d.guarded);
    if (named === f.names && unguarded === f.deletionUnguarded) behaved += 1;
    else {
      failures.push(
        `${TAG} the scanner misread the fixture "${f.name}": named ${String(named)} (want ${String(f.names)}), unguarded ${String(unguarded)} (want ${String(f.deletionUnguarded)})`
      );
    }
  }
  // Phase 203's two scanners, proved the same way, three that must pass and
  // four that must fail.
  const READER_FIXTURES = [
    { name: 'attributes only', text: "execFile('/usr/bin/security', ['find-generic-password', '-s', service], {}, cb);\n", payload: false, logs: false },
    { name: 'a comment mentioning -w', text: "// never pass -w here, it prints the secret\nconst a = 1;\n", payload: false, logs: false },
    { name: 'the payload flag', text: "execFile('/usr/bin/security', ['find-generic-password', '-s', service, '-w'], {}, cb);\n", payload: true, logs: false },
    { name: 'the payload flag first', text: "const args = ['-w', 'find-generic-password'];\n", payload: true, logs: false },
    { name: 'a console line', text: "console.log('found', service);\n", payload: false, logs: true },
    { name: 'a scoped logger', text: "const log = getLog('accounts');\nlog.info('x', {});\n", payload: false, logs: true },
    { name: 'a plain function called log in a name', text: "const catalog = 1;\nexport const dialog = catalog;\n", payload: false, logs: false }
  ];
  for (const f of READER_FIXTURES) {
    const payload = asksForAPayload(f.text);
    const logs = writesALog(f.text);
    if (payload === f.payload && logs === f.logs) behaved += 1;
    else {
      failures.push(
        `${TAG} the reader scanner misread the fixture "${f.name}": payload ${String(payload)} (want ${String(f.payload)}), logs ${String(logs)} (want ${String(f.logs)})`
      );
    }
  }
  notes.push(
    `${String(behaved)} of ${String(FIXTURES.length + READER_FIXTURES.length)} scanner fixtures behaved`
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Phase 281. Rules 13 to 17, THE ITEM CLAUDE CODE READS.
//
// These read with build/scan-source.mjs's comment stripper rather than this
// file's own, because the source they read holds a regular expression
// (`CLAUDE_KEYCHAIN_ACCOUNT_RE`) and template literals that a line-comment
// regex would cut in half. The older rules keep the stripper they were proved
// with.
//
// Every finding carries the rule it belongs to, so an ablation is asked to
// turn ITS rule red rather than to change something, anything, somewhere.
// ---------------------------------------------------------------------------

/** One finding, owned by one rule. */
function finding(rule, sentence) {
  return { rule, sentence: `${TAG} rule ${String(rule)} ${sentence}` };
}

const IDENT = '[A-Za-z_$][\\w$]*';

/** Quotes made uniform and space removed, so `"-a"` and `'-a'` compare. */
function token(text) {
  return text.replace(/["`]/g, "'").replace(/\s+/g, '');
}

/** Every array literal in `code` that opens with `'<verb>'`, as its elements. */
function argvLiterals(code, verb) {
  const out = [];
  const re = new RegExp(`\\[\\s*['"\`]${verb}['"\`]`, 'g');
  let m;
  while ((m = re.exec(code)) !== null) {
    out.push(callArguments(code, m.index).map(token).filter((e) => e !== ''));
  }
  return out;
}

/** Does `elements` hold `flag` immediately followed by `value`? */
function pairIn(elements, flag, value) {
  const at = elements.indexOf(`'${flag}'`);
  return at >= 0 && elements[at + 1] === value;
}

/**
 * Rule 13, the meter's reader. The one argv `keychainReader`'s `keychain`
 * arrow hands `runGuarded` carries `-a` with that arrow's ACCOUNT parameter,
 * `-s` with its SERVICE parameter, and `-w`, which the reader needs. The
 * parameters are read from the arrow rather than assumed, so a literal account
 * such as the one Phase 204's probe once seeded is not the account.
 */
function readerArgvFinding(credentialsText) {
  const code = stripCommentsExact(credentialsText);
  const decl = /\bfunction\s+keychainReader\s*\(/.exec(code);
  if (decl === null) return finding(13, 'cannot find keychainReader in src/main/usage/credentials.ts, so the meter read it names is not the one this gate reads');
  const arrow = new RegExp(`\\bkeychain\\s*:\\s*async\\s*\\(\\s*(${IDENT})\\s*,\\s*(${IDENT})\\s*\\)\\s*=>\\s*\\{`, 'g');
  arrow.lastIndex = decl.index;
  const m = arrow.exec(code);
  if (m === null) {
    return finding(13, "keychainReader's keychain no longer takes (service, account), so the meter asks the keychain without the account Claude Code's item is filed under");
  }
  const body = blockAt(code, m.index + m[0].length - 1) ?? '';
  const argvs = argvLiterals(body, 'find-generic-password');
  if (argvs.length !== 1) {
    return finding(13, `keychainReader holds ${String(argvs.length)} find-generic-password argv literals; it must hold exactly one`);
  }
  const [service, account] = [m[1], m[2]];
  const argv = argvs[0];
  if (!pairIn(argv, '-a', account) || !pairIn(argv, '-s', service) || !argv.includes("'-w'")) {
    return finding(
      13,
      `THE METER'S KEYCHAIN READ SENDS [${argv.join(', ')}], not -a ${account} -s ${service} -w, so it can land on an item under another account, which is the stray research 126 §2.4 found`
    );
  }
  return null;
}

/**
 * Rule 13, the presence check. `defaultLoginAccountDeps`'s `keychainHas` hands
 * `security` `-a` with its account parameter and `-s` with its service
 * parameter, and still never `-w` or `-g`, which are the two flags that print
 * a secret.
 */
function presenceArgvFinding(accountsText) {
  const code = stripCommentsExact(accountsText);
  const body = functionBodyOf(code, 'defaultLoginAccountDeps');
  if (body === null) return finding(13, 'cannot find defaultLoginAccountDeps in src/main/usage/login-accounts.ts');
  const m = new RegExp(`\\bkeychainHas\\s*:\\s*(?:async\\s*)?\\(\\s*(${IDENT})\\s*,\\s*(${IDENT})\\s*\\)\\s*=>`).exec(body);
  if (m === null) {
    return finding(13, "the presence check's default keychainHas no longer takes (service, account), so it asks by service alone");
  }
  const argvs = argvLiterals(body.slice(m.index), 'find-generic-password');
  if (argvs.length !== 1) {
    return finding(13, `the presence check holds ${String(argvs.length)} find-generic-password argv literals; it must hold exactly one`);
  }
  const argv = argvs[0];
  if (argv.includes("'-w'") || argv.includes("'-g'")) {
    return finding(13, `THE PRESENCE CHECK ASKS FOR A SECRET: [${argv.join(', ')}]`);
  }
  if (!pairIn(argv, '-a', m[2]) || !pairIn(argv, '-s', m[1])) {
    return finding(
      13,
      `THE PRESENCE CHECK SENDS [${argv.join(', ')}], not -a ${m[2]} -s ${m[1]}, so a login reads as signed in on the strength of an item no Claude Code session reads`
    );
  }
  return null;
}

/**
 * Rule 13, the calls above those argvs. Every `keychainHas(` in
 * `readLoginPresence` and every `keychain(` in `readClaudeCredential` passes
 * two arguments, the second being a name that function assigns from
 * `claudeKeychainAccount(`. And both default seams hand that rule the
 * machine's user name, because a seam without it gives every person whose
 * `USER` is unset the vendor's fallback account instead of their own.
 */
function seamCallFindings(credentialsText, accountsText) {
  const out = [];
  const asks = [
    { text: accountsText, fn: 'readLoginPresence', call: 'keychainHas', file: 'login-accounts.ts' },
    { text: credentialsText, fn: 'readClaudeCredential', call: 'keychain', file: 'credentials.ts' }
  ];
  for (const a of asks) {
    const body = functionBodyOf(stripCommentsExact(a.text), a.fn);
    if (body === null) {
      out.push(finding(13, `cannot find ${a.fn} in ${a.file}`));
      continue;
    }
    const accountNames = new Set(
      [...body.matchAll(new RegExp(`\\b(?:const|let)\\s+(${IDENT})\\s*=\\s*claudeKeychainAccount\\s*\\(`, 'g'))].map((x) => x[1])
    );
    const calls = [...body.matchAll(new RegExp(`\\.${a.call}\\s*\\(`, 'g'))];
    if (calls.length === 0) out.push(finding(13, `${a.fn} no longer asks ${a.call} at all`));
    for (const c of calls) {
      const args = callArguments(body, c.index + c[0].length - 1).filter((x) => x !== '');
      const second = args[1] ?? '';
      if (args.length !== 2 || !(accountNames.has(second) || /^claudeKeychainAccount\s*\(/.test(second))) {
        out.push(
          finding(13, `${a.fn} calls ${a.call}(${args.join(', ')}), which is not the one vendor name under the account claudeKeychainAccount gives`)
        );
      }
    }
  }
  for (const [text, fn, file] of [
    [credentialsText, 'defaultCredentialDeps', 'credentials.ts'],
    [accountsText, 'defaultLoginAccountDeps', 'login-accounts.ts']
  ]) {
    const body = functionBodyOf(stripCommentsExact(text), fn) ?? '';
    if (!/\bosUserName\s*:\s*\(\s*\)\s*=>\s*userInfo\s*\(\s*\)\s*\.\s*username\b/.test(body)) {
      out.push(finding(13, `${file}'s ${fn} does not pass osUserName: () => userInfo().username, so a person with no USER is asked for under claude-code-user`));
    }
  }
  return out;
}

/** A scoped service expression: the hash, the one-name rule, or the template. */
const SCOPED_EXPR = /\bclaudeScopedService\s*\(|\bclaudeKeychainService\s*\(|\$\{\s*CLAUDE_KEYCHAIN_SERVICE\s*\}\s*-/;
/** The plain vendor name, by constant or by literal, and never the scoped template. */
const PLAIN_EXPR = /\bCLAUDE_KEYCHAIN_SERVICE\b(?!\s*\}\s*-)|(['"`])Claude Code-credentials\1/;

/** Names a file assigns a scoped expression to. */
function scopedNamesIn(code) {
  const names = new Set();
  const re = new RegExp(
    `\\b(?:(?:const|let|var)\\s+)?(${IDENT})\\s*(?::[^=;]+)?=\\s*(?:await\\s+)?(?:claudeScopedService|claudeKeychainService)\\s*\\(`,
    'g'
  );
  for (const m of code.matchAll(re)) names.add(m[1]);
  return names;
}

/** Where in `text` a scoped expression or a scoped name first ends, or -1. */
function scopedEnd(text, names) {
  let start = -1;
  let end = -1;
  const direct = SCOPED_EXPR.exec(text);
  if (direct !== null) {
    const opens = direct[0].endsWith('(') ? direct.index + direct[0].length - 1 : -1;
    const closes = opens >= 0 ? closeOf(text, opens) : -1;
    start = direct.index;
    end = closes >= 0 ? closes + 1 : direct.index + direct[0].length;
  }
  for (const name of names) {
    const m = new RegExp(`(^|[^\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`).exec(text);
    if (m !== null) {
      const at = m.index + m[1].length;
      if (start < 0 || at < start) {
        start = at;
        end = m.index + m[0].length;
      }
    }
  }
  return end;
}

/** Which offsets of `code` sit inside a string or template literal. */
function stringMask(code) {
  const inside = new Uint8Array(code.length);
  let quote = '';
  for (let i = 0; i < code.length; i += 1) {
    const c = code[i];
    if (quote !== '') {
      inside[i] = 1;
      if (c === '\\') {
        inside[i + 1] = 1;
        i += 1;
      } else if (c === quote) quote = '';
    } else if (c === "'" || c === '"' || c === '`') {
      quote = c;
      inside[i] = 1;
    }
  }
  return inside;
}

/**
 * Rule 14's list scanner, over one file's text. Returns a sentence per shape.
 *
 * THREE SHAPES, being every way the Phase 181 fallback was written or could be
 * written again: an ARRAY that names the plain name after a scoped one, which
 * is what `claudeServicesFor` returned and what a loop iterated; a PUSH of the
 * plain name after a push of a scoped one inside one function; and the Phase
 * 203 function itself brought back by name.
 */
function fallbackListsIn(text) {
  const code = stripCommentsExact(text);
  const names = scopedNamesIn(code);
  const out = [];
  if (/\bclaudeServicesFor\b/.test(code)) {
    out.push('names claudeServicesFor, the list of services Phase 281 removed');
  }
  const inString = stringMask(code);
  for (let i = code.indexOf('['); i >= 0; i = code.indexOf('[', i + 1)) {
    // A bracket inside a string is text, and pairing it would read the rest
    // of the file as one list.
    if (inString[i] === 1) continue;
    const close = closeOf(code, i);
    if (close < 0) continue;
    const inner = code.slice(i + 1, close);
    const end = scopedEnd(inner, names);
    if (end >= 0 && PLAIN_EXPR.test(inner.slice(end))) {
      out.push(`holds a list naming the plain vendor name after a scoped one: [${inner.replace(/\s+/g, ' ').trim().slice(0, 120)}]`);
    }
  }
  for (const [fn, body] of namedFunctions(code)) {
    let scopedSeen = false;
    for (const m of body.matchAll(/\.(?:push|unshift)\s*\(/g)) {
      const args = callArguments(body, m.index + m[0].length - 1).join(', ');
      if (scopedSeen && PLAIN_EXPR.test(args)) {
        out.push(`${fn} pushes the plain vendor name after a scoped one`);
        break;
      }
      if (scopedEnd(args, names) >= 0) scopedSeen = true;
    }
  }
  return out;
}

/** The text of the statement starting at `from`, up to its `;` at depth zero. */
function statementAt(code, from) {
  let depth = 0;
  let quote = '';
  for (let i = from; i < code.length; i += 1) {
    const c = code[i];
    if (quote !== '') {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) {
      if (depth === 0) return code.slice(from, i);
      depth -= 1;
    } else if (c === ';' && depth === 0) return code.slice(from, i);
  }
  return code.slice(from);
}

/** A ternary split into the expressions it can answer. `??` and `?.` are not ternaries. */
function ternaryArms(expr) {
  let text = expr.trim();
  while (text.startsWith('(') && closeOf(text, 0) === text.length - 1) text = text.slice(1, -1).trim();
  let depth = 0;
  let quote = '';
  let q = -1;
  let nested = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quote !== '') {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) depth -= 1;
    else if (depth === 0 && c === '?') {
      if (text[i + 1] === '?' || text[i + 1] === '.' || text[i - 1] === '?') continue;
      if (q < 0) q = i;
      else nested += 1;
    } else if (depth === 0 && c === ':' && q >= 0) {
      if (nested > 0) nested -= 1;
      else return [...ternaryArms(text.slice(q + 1, i)), ...ternaryArms(text.slice(i + 1))];
    }
  }
  return [text];
}

/**
 * Rule 14's second half. `claudeKeychainService` answers FIVE arms, one per
 * branch of the vendor rule (a login directory; the secure-storage variable
 * defined and empty; defined and not empty; a non-empty `CLAUDE_CONFIG_DIR`;
 * neither), and each arm is exactly ONE name: the plain constant, or
 * `claudeScopedService` of one variable. The scoped arms hash the login
 * directory, then the secure-storage variable, then `CLAUDE_CONFIG_DIR`, in
 * that order, and the plain name answers exactly twice. A list, a `??` chain,
 * a lost branch or a branch hashing the wrong variable each breaks one of
 * those, and an `if` rewrite of the same rule breaks none.
 */
function serviceArmsFinding(credentialsText) {
  const code = stripCommentsExact(credentialsText);
  const decl = /\bfunction\s+claudeKeychainService\s*\(/.exec(code);
  const body = functionBodyOf(code, 'claudeKeychainService');
  if (decl === null || body === null) return finding(14, 'cannot find claudeKeychainService, the one-name service rule');
  const params = callArguments(code, decl.index + decl[0].length - 1);
  const first = (text) => new RegExp(`^\\s*(${IDENT})`).exec(text ?? '')?.[1] ?? null;
  const envName = first(params[0]);
  const loginName = first(params[params.length - 1]);
  const bound = (variable) =>
    new RegExp(
      `\\b(?:const|let)\\s+(${IDENT})\\s*=\\s*${envName}\\s*(?:\\[\\s*['"\`]${variable}['"\`]\\s*\\]|\\.${variable}\\b)`
    ).exec(body)?.[1] ?? null;
  const secureName = bound('CLAUDE_SECURESTORAGE_CONFIG_DIR');
  const ownName = bound('CLAUDE_CONFIG_DIR');
  const arms = [];
  for (const m of body.matchAll(/\breturn\b/g)) {
    arms.push(...ternaryArms(statementAt(body, m.index + m[0].length)).map((a) => a.replace(/\s+/g, '')));
  }
  const scopedArgs = [];
  let plain = 0;
  const shapeless = [];
  for (const arm of arms) {
    const scoped = new RegExp(`^claudeScopedService\\((${IDENT})\\)$`).exec(arm);
    if (arm === 'CLAUDE_KEYCHAIN_SERVICE') plain += 1;
    else if (scoped !== null) scopedArgs.push(scoped[1]);
    else shapeless.push(arm);
  }
  const want = [loginName, secureName, ownName];
  if (
    arms.length !== 5 ||
    shapeless.length > 0 ||
    plain !== 2 ||
    want.includes(null) ||
    JSON.stringify(scopedArgs) !== JSON.stringify(want)
  ) {
    return finding(
      14,
      `claudeKeychainService answers [${arms.join(' | ')}], not one name per branch of the vendor rule (five arms, the plain name twice, scoped over ${want.map(String).join(', ')} in that order), so a reader can be handed a list or the wrong item`
    );
  }
  return null;
}

/** Every non-test TypeScript file under a directory, by path. */
function sourceFilesUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFilesUnder(path));
    else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) out.push(path);
  }
  return out;
}

/**
 * Rules 13 and 14 over one pair of usage files, and rule 14's list scan over
 * both domains with those two files standing in for the shipping ones.
 */
function sourceFindings(usageDir) {
  const credentialsText = readFileSync(join(usageDir, 'credentials.ts'), 'utf8');
  const accountsText = readFileSync(join(usageDir, 'login-accounts.ts'), 'utf8');
  const out = [
    readerArgvFinding(credentialsText),
    presenceArgvFinding(accountsText),
    ...seamCallFindings(credentialsText, accountsText),
    serviceArmsFinding(credentialsText)
  ].filter((f) => f !== null);
  const stand = new Map([
    [CREDENTIALS_FILE, credentialsText],
    [ACCOUNTS_FILE, accountsText]
  ]);
  for (const path of [...sourceFilesUnder(USAGE), ...sourceFilesUnder(CREDENTIALS_DOMAIN)]) {
    const text = stand.get(path) ?? readFileSync(path, 'utf8');
    for (const shape of fallbackListsIn(text)) {
      out.push(finding(14, `${path.slice(repoRoot.length + 1)} ${shape}, which is the plain-name fallback research 126 §5 refutes`));
    }
  }
  return out;
}

/** The vendor's scoped name, derived HERE by this file's own hash of the NFC form. */
function derivedScoped(dir) {
  return `Claude Code-credentials-${createHash('sha256').update(dir.normalize('NFC')).digest('hex').slice(0, 8)}`;
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Rules 13, 15, 16 and 17, over the probe's section 9. Every expected service
 * name is derived by this file from the directory the probe used, and every
 * expected account is the synthetic one the probe declares, which must look
 * synthetic.
 */
function vendorFindings(v) {
  if (v === undefined || v === null) {
    return [13, 15, 16, 17, 18].map((rule) => finding(rule, 'the probe printed no Phase 281 reading'));
  }
  const out = [];
  const say = (rule, ok, sentence) => {
    if (!ok) out.push(finding(rule, sentence));
  };
  const vendor = v.accounts?.vendor;
  const stray = v.accounts?.stray;
  say(13, /^p281-/.test(vendor ?? '') && /^p281-/.test(stray ?? '') && vendor !== stray, 'the probe keyed its keychain by an account that is not a synthetic p281- one');
  const plain = 'Claude Code-credentials';
  const one = (service) => [[service, vendor]];

  // Rule 13, driven.
  say(13, same(v.presence?.loginAsked, one(derivedScoped(v.presence?.loginDir ?? ''))), `A LOGIN'S PRESENCE ASKED ${JSON.stringify(v.presence?.loginAsked)}, not its one scoped name under the vendor account`);
  say(13, same(v.presence?.defaultAsked, one(plain)), `THE DEFAULT LOGIN'S PRESENCE ASKED ${JSON.stringify(v.presence?.defaultAsked)}, not the plain name under the vendor account`);
  say(13, v.presence?.strayOnly === false, 'A STRAY ITEM UNDER ANOTHER ACCOUNT READ AS A SIGNED IN LOGIN, so presence asked without the account');
  say(13, v.presence?.vendorBehindStray === true, 'the vendor item behind a stray read as absent, so the stray check above proves nothing');
  const wantArgv = ['find-generic-password', '-a', vendor, '-s', plain, '-w'];
  say(13, same(v.reader?.argv, [wantArgv]), `THE SHIPPING keychainReader SENT ${JSON.stringify(v.reader?.argv)}, not ${JSON.stringify([wantArgv])}`);
  say(13, v.reader?.answer === 'vendor', `the shipping keychainReader answered ${String(v.reader?.answer)} over a stray listed first, not the vendor item`);
  say(13, v.reader?.credential === 'vendor' && same(v.reader?.credentialArgv, [wantArgv]), `the meter read ${String(v.reader?.credential)} through the shipping reader, sending ${JSON.stringify(v.reader?.credentialArgv)}`);
  say(13, v.reader?.emptyAccount === 'throw' && v.reader?.emptyAccountSpawned === 0, `an empty account answered ${String(v.reader?.emptyAccount)} and started ${String(v.reader?.emptyAccountSpawned)} program(s), so a read with no account is not refused before it becomes the service-only lookup`);

  // Rule 15, branch B.
  const configScoped = derivedScoped(v.branchB?.configDir ?? '');
  for (const row of ['stray', 'vendor']) {
    say(15, v.branchB?.[row]?.answer === 'missing', `BRANCH B WITH A PLAIN ITEM UNDER THE ${row.toUpperCase()} ACCOUNT ANSWERED ${String(v.branchB?.[row]?.answer)}, so the meter draws numbers a Claude Code session under that directory never reads`);
    say(15, same(v.branchB?.[row]?.asked, one(configScoped)), `branch B (${row}) asked ${JSON.stringify(v.branchB?.[row]?.asked)}, not the one scoped name of CLAUDE_CONFIG_DIR under the vendor account`);
  }
  say(15, v.branchB?.control?.answer === 'vendor' && same(v.branchB?.control?.asked, one(configScoped)), `the branch B control answered ${String(v.branchB?.control?.answer)} asking ${JSON.stringify(v.branchB?.control?.asked)}, so the missing answers above prove nothing`);

  // Rule 16, the miss and failure split.
  const exits = v.exits ?? {};
  say(16, exits['44'] === 'null', `the shipping keychainReader answered ${String(exits['44'])} for exit 44, which is the one exit that means no such item`);
  for (const code of ['36', '1', 'spawn']) {
    say(16, exits[code] === 'throw', `THE SHIPPING keychainReader ANSWERED ${String(exits[code])} FOR ${code === 'spawn' ? 'A PROGRAM THAT CANNOT START' : `EXIT ${code}`}, so a keychain that could not answer reads as a sign out`);
  }
  const through = v.credentialExits ?? {};
  say(16, through['44'] === 'missing', `the meter answered ${String(through['44'])} over exit 44, not missing`);
  for (const code of ['36', '1']) {
    say(16, through[code] === 'throw', `THE METER ANSWERED ${String(through[code])} OVER EXIT ${code} with no file, so a locked keychain tells a signed in person to sign in`);
  }
  say(16, through.fileStandsIn === 'vendor', `the meter answered ${String(through.fileStandsIn)} over exit 36 with a usable file, so an unreadable keychain hides the file`);

  // Rule 17, NFC.
  const dir = v.nfc?.dir ?? '';
  const want = derivedScoped(dir);
  const raw = `Claude Code-credentials-${createHash('sha256').update(dir).digest('hex').slice(0, 8)}`;
  say(17, dir !== dir.normalize('NFC') && raw !== want, 'the NFC fixture directory is already composed, so rule 17 stopped testing anything');
  for (const key of ['scoped', 'composed', 'viaConfig', 'viaSecure', 'viaLogin']) {
    say(17, v.nfc?.[key] === want, `A DECOMPOSED DIRECTORY NAMED ${String(v.nfc?.[key])} through ${key}, and this file derives ${want} from its NFC form, so Tortie asks an item Claude Code never writes`);
  }
  say(17, same(v.nfc?.presenceAsked, one(want)) && same(v.nfc?.credentialAsked, one(want)), `a decomposed directory was asked as ${JSON.stringify([v.nfc?.presenceAsked, v.nfc?.credentialAsked])}, not ${want}`);

  // Rule 18, the named exception, with the vendor's answers derived here.
  const sl = v.secureLogin ?? {};
  const loginScoped = derivedScoped(sl.dir ?? '');
  const vendorEmpty = plain;
  const vendorSet = derivedScoped(sl.secure ?? '');
  say(18, typeof sl.dir === 'string' && sl.dir !== '' && typeof sl.secure === 'string' && sl.secure !== '' && sl.secure !== sl.dir, 'the probe printed no named-exception reading');
  say(18, sl.empty === loginScoped && sl.empty !== vendorEmpty, `A CHOSEN LOGIN UNDER AN EMPTY CLAUDE_SECURESTORAGE_CONFIG_DIR IS NAMED ${String(sl.empty)}; the pinned exception is the login's ${loginScoped} against the vendor's plain item, and this row moved`);
  say(18, sl.set === loginScoped && sl.set !== vendorSet, `A CHOSEN LOGIN UNDER A SET CLAUDE_SECURESTORAGE_CONFIG_DIR IS NAMED ${String(sl.set)}; the pinned exception is the login's ${loginScoped} against the vendor's ${vendorSet}, and this row moved`);
  say(18, sl.equal === loginScoped, `with the variable equal to the login directory Tortie named ${String(sl.equal)}, not ${loginScoped}, so the two disagree where they must agree`);
  say(18, sl.unset === loginScoped, `with the variable unset Tortie named ${String(sl.unset)} for the login, not ${loginScoped}, so the exception is wider than the variable`);
  return out;
}

// Rules 13 and 14 over the shipping source.
for (const f of sourceFindings(USAGE)) failures.push(f.sentence);

// The Phase 281 scanners, proved on fixtures. A scanner nobody has seen fail
// is a scanner nobody has seen work.
{
  const READER = (argv, params = 'service, account') =>
    `export function keychainReader(bin = B): {\n  keychain(service: string, account: string): Promise<string | null>;\n  cancel(): number;\n} {\n  return {\n    keychain: async (${params}) => {\n      const run = await runGuarded(bin, ${argv}, {});\n      return run.stdout;\n    }\n  };\n}\n`;
  const PRESENCE = (argv) =>
    `export function defaultLoginAccountDeps(): LoginAccountDeps {\n  return {\n    keychainHas: (service, account) =>\n      new Promise<boolean>((resolve) => {\n        // never '-w'\n        execFile('/usr/bin/security', ${argv}, {}, (err) => resolve(err === null));\n      })\n  };\n}\n`;
  const SERVICE = (body) =>
    `export function claudeKeychainService(\n  env: Readonly<Record<string, string | undefined>>,\n  loginDir: string | null\n): string {\n${body}\n}\n`;
  const SHIPPED_SERVICE = SERVICE(
    "  if (loginDir !== null && loginDir !== '') return claudeScopedService(loginDir);\n" +
      "  const secure = env['CLAUDE_SECURESTORAGE_CONFIG_DIR'];\n" +
      '  if (secure !== undefined) {\n' +
      "    return secure === '' ? CLAUDE_KEYCHAIN_SERVICE : claudeScopedService(secure);\n" +
      '  }\n' +
      "  const own = env['CLAUDE_CONFIG_DIR'];\n" +
      "  return own !== undefined && own !== ''\n" +
      '    ? claudeScopedService(own)\n' +
      '    : CLAUDE_KEYCHAIN_SERVICE;'
  );
  const P281_FIXTURES = [
    { name: 'the reader sending -a account -s service -w', red: readerArgvFinding(READER("['find-generic-password', '-a', account, '-s', service, '-w']")) !== null, want: false },
    { name: 'the reader with no -a', red: readerArgvFinding(READER("['find-generic-password', '-s', service, '-w']")) !== null, want: true },
    { name: 'the reader sending a literal account', red: readerArgvFinding(READER("['find-generic-password', '-a', 'p281-literal', '-s', service, '-w']")) !== null, want: true },
    { name: 'the reader taking the service alone', red: readerArgvFinding(READER("['find-generic-password', '-s', service, '-w']", 'service')) !== null, want: true },
    { name: 'the reader with -a only in a comment', red: readerArgvFinding(READER("['find-generic-password', /* '-a', account, */ '-s', service, '-w']")) !== null, want: true },
    { name: 'presence sending -a account -s service', red: presenceArgvFinding(PRESENCE("['find-generic-password', '-a', account, '-s', service]")) !== null, want: false },
    { name: 'presence with no -a', red: presenceArgvFinding(PRESENCE("['find-generic-password', '-s', service]")) !== null, want: true },
    { name: 'presence with -a and -w', red: presenceArgvFinding(PRESENCE("['find-generic-password', '-a', account, '-s', service, '-w']")) !== null, want: true },
    { name: 'presence with the account and service swapped', red: presenceArgvFinding(PRESENCE("['find-generic-password', '-a', service, '-s', account]")) !== null, want: true },
    { name: 'one scoped name in a list', red: fallbackListsIn('export function f(d: string) { return [claudeScopedService(d)]; }\n').length > 0, want: false },
    { name: 'the fallback only in a comment', red: fallbackListsIn('// return [claudeScopedService(d), CLAUDE_KEYCHAIN_SERVICE];\nexport const a = 1;\n').length > 0, want: false },
    { name: 'the scoped template itself', red: fallbackListsIn('export function s(h: string) { return [`${CLAUDE_KEYCHAIN_SERVICE}-${h}`]; }\n').length > 0, want: false },
    { name: "the Phase 181 fallback's own shape", red: fallbackListsIn("export function servicesFor(own: string) {\n  return own !== ''\n    ? [claudeScopedService(own), CLAUDE_KEYCHAIN_SERVICE]\n    : [CLAUDE_KEYCHAIN_SERVICE];\n}\n").length > 0, want: true },
    { name: 'a loop over a scoped name held in a variable, then the literal', red: fallbackListsIn("export async function has(d, dir) {\n  const scoped = claudeKeychainService(d.env, dir);\n  for (const service of [scoped, 'Claude Code-credentials']) {\n    if (await d.keychainHas(service)) return true;\n  }\n  return false;\n}\n").length > 0, want: true },
    { name: 'pushes, scoped then plain', red: fallbackListsIn('function names(env, dir) {\n  const out = [];\n  out.push(claudeKeychainService(env, dir));\n  out.push(CLAUDE_KEYCHAIN_SERVICE);\n  return out;\n}\n').length > 0, want: true },
    { name: 'a multi-line list of the template then the plain name', red: fallbackListsIn('export function s(h: string) {\n  return [\n    `${CLAUDE_KEYCHAIN_SERVICE}-${h}`,\n    CLAUDE_KEYCHAIN_SERVICE\n  ];\n}\n').length > 0, want: true },
    { name: 'claudeServicesFor brought back by name', red: fallbackListsIn("import { claudeServicesFor } from './credentials';\nexport const f = (d, dir) => claudeServicesFor(d, dir);\n").length > 0, want: true },
    { name: 'the service rule as shipped', red: serviceArmsFinding(SHIPPED_SERVICE) !== null, want: false },
    {
      name: 'the service rule rewritten as if statements',
      red:
        serviceArmsFinding(
          SERVICE(
            "  if (loginDir !== null && loginDir !== '') return claudeScopedService(loginDir);\n" +
              '  const secure = env.CLAUDE_SECURESTORAGE_CONFIG_DIR;\n' +
              '  if (secure !== undefined) {\n' +
              "    if (secure === '') return CLAUDE_KEYCHAIN_SERVICE;\n" +
              '    return claudeScopedService(secure);\n' +
              '  }\n' +
              "  const own = env['CLAUDE_CONFIG_DIR'];\n" +
              "  if (own !== undefined && own !== '') return claudeScopedService(own);\n" +
              '  return CLAUDE_KEYCHAIN_SERVICE;'
          )
        ) !== null,
      want: false
    },
    { name: 'the service rule answering a list', red: serviceArmsFinding(SHIPPED_SERVICE.replace('? claudeScopedService(own)', '? [claudeScopedService(own), CLAUDE_KEYCHAIN_SERVICE]')) !== null, want: true },
    { name: 'the service rule with a ?? chain', red: serviceArmsFinding(SHIPPED_SERVICE.replace('? claudeScopedService(own)', '? claudeScopedService(own) ?? CLAUDE_KEYCHAIN_SERVICE')) !== null, want: true },
    { name: 'the secure-storage branch lost', red: serviceArmsFinding(SHIPPED_SERVICE.replace("return secure === '' ? CLAUDE_KEYCHAIN_SERVICE : claudeScopedService(secure);", 'return claudeScopedService(secure);')) !== null, want: true },
    { name: 'CLAUDE_CONFIG_DIR answering the plain name', red: serviceArmsFinding(SHIPPED_SERVICE.replace('? claudeScopedService(own)', '? CLAUDE_KEYCHAIN_SERVICE')) !== null, want: true },
    { name: 'the secure-storage branch hashing CLAUDE_CONFIG_DIR', red: serviceArmsFinding(SHIPPED_SERVICE.replace(': claudeScopedService(secure);', ': claudeScopedService(own);')) !== null, want: true }
  ];
  let behaved = 0;
  for (const f of P281_FIXTURES) {
    if (f.red === f.want) behaved += 1;
    else failures.push(`${TAG} a Phase 281 scanner misread the fixture "${f.name}": red ${String(f.red)} (want ${String(f.want)})`);
  }
  notes.push(`${String(behaved)} of ${String(P281_FIXTURES.length)} Phase 281 scanner fixtures behaved`);
}

// ---------------------------------------------------------------------------
// The probe, over the tree and over ablated copies of it.
// ---------------------------------------------------------------------------

function runProbe(loginsDir, accountsDir = null, copyDir = null) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/logins-conformance-probe.mts'],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        ...(loginsDir === null ? {} : { P202_LOGINS_DIR: loginsDir }),
        ...(accountsDir === null ? {} : { P203_ACCOUNTS_DIR: accountsDir }),
        // PHASE 287. The words file is staged beside the logins copy, so rule
        // 19's copy clauses are ablated over a sibling copy like everything else.
        ...(copyDir === null ? {} : { P287_COPY_DIR: copyDir })
      }
    }
  );
  if (probe.status !== 0) {
    return { error: `the probe did not run: ${probe.stderr || '(no output)'}` };
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return { error: `the probe printed no JSON: ${probe.stdout.slice(0, 400)}` };
  }
}

/** What each element of {@link verdict} is, in order, so a moved one can be named. */
const VERDICT_PARTS = [
  'owned',
  'hostile',
  'linked',
  'create',
  'numeric',
  'sweepLinked',
  'refusals',
  'chosen',
  'leak',
  'gone',
  'file',
  'presence',
  'account',
  'vendor',
  'tooLarge'
];

/**
 * The whole set of runtime claims, as one comparable value. An ablation must
 * change at least one of them, or the rule it removed was not being checked.
 */
function verdict(d) {
  if ('error' in d) return ['error'];
  return [
    JSON.stringify(d.owned),
    JSON.stringify(d.hostile),
    JSON.stringify(d.linked),
    JSON.stringify(d.create),
    JSON.stringify(d.numeric),
    JSON.stringify(d.sweepLinked),
    JSON.stringify(d.refusals),
    JSON.stringify(d.chosen),
    JSON.stringify(d.leak),
    JSON.stringify(d.gone),
    JSON.stringify(d.file),
    // Phase 203. The directory is a fresh temporary path on every run, so it
    // is left out of the verdict and only its DERIVED name is compared.
    // Phase 281 records the ACCOUNT beside each service asked, and the
    // accounts are synthetic constants, so they are compared whole.
    JSON.stringify({
      ...d.presence,
      scoped: '',
      dir: '',
      askedForLogin: d.presence?.askedForLogin?.length ?? 0,
      askedForLoginAccounts: (d.presence?.askedForLogin ?? []).map((pair) => pair?.[1] ?? null)
    }),
    JSON.stringify(d.account),
    // Phase 281. Section 9 uses fixed synthetic directories, so every reading
    // in it is the same on every run.
    JSON.stringify(d.vendor ?? null),
    // Phase 287. Every reading in it is a boolean or a fixed string.
    JSON.stringify(d.tooLarge ?? null)
  ];
}

const live = runProbe(null);
if ('error' in live) {
  failures.push(`${TAG} ${live.error}`);
} else {
  // Rule 3.
  for (const row of live.owned) {
    check(
      row.got === row.want,
      `${TAG} isOwnedLoginDir(${row.provider}, ${row.path}) answered ${String(row.got)}, wanted ${String(row.want)}`
    );
  }
  check(live.hostile.kept === 0, `${TAG} a hostile logins file kept ${String(live.hostile.kept)} rows`);
  check(
    live.hostile.problems >= 5,
    `${TAG} a hostile logins file named only ${String(live.hostile.problems)} problems`
  );
  check(live.hostile.chosen === null, `${TAG} a dropped row was still chosen`);
  check(live.hostile.effectiveDir === null, `${TAG} a dropped row still resolved to a directory`);
  check(!live.refusals.escape, `${TAG} a remove aimed at a dropped row was accepted`);
  check(!live.refusals.default, `${TAG} the default login can be removed`);
  check(
    live.refusals.victimSurvives,
    `${TAG} a directory outside the owned root was deleted by a remove`
  );
  // Rule 3b, the link.
  check(
    live.linked.spelledInside,
    `${TAG} the planted link is no longer spelled inside the root, so this probe stopped testing the attack`
  );
  check(live.linked.entry === 'escapes', `${TAG} A LOGIN DIRECTORY THAT IS A LINK WAS ACCEPTED`);
  check(
    live.linked.providerRoot === 'escapes',
    `${TAG} a provider root that is a link was accepted`
  );
  check(
    live.linked.loginsRoot === 'escapes',
    `${TAG} a logins root that is a link was accepted`
  );
  check(live.linked.notAFolder === 'escapes', `${TAG} a file where a folder should be was accepted`);
  check(
    live.linked.absent === 'absent',
    `${TAG} a folder that is simply gone read as an escape, so the fallback cannot be honest`
  );
  check(live.linked.kept === 0, `${TAG} a linked login row was kept`);
  check(live.linked.problems.length >= 1, `${TAG} a linked login row was dropped with no sentence`);
  check(live.linked.listed === 0, `${TAG} a linked login was listed`);
  check(
    !live.linked.presentAnywhere,
    `${TAG} A LINKED LOGIN READ AS PRESENT, so a credential outside Tortie's data was looked for`
  );
  check(live.linked.chosen === null, `${TAG} a linked login row was still chosen`);
  check(live.linked.resolvedDir === null, `${TAG} A LINKED LOGIN RESOLVED TO A DIRECTORY`);
  check(live.linked.effectiveDir === null, `${TAG} the meter would read a linked login's directory`);
  check(!live.linked.chooseOk, `${TAG} a linked login could be chosen`);
  check(
    live.linked.victimSurvives,
    `${TAG} the directory a link pointed at was deleted by a refusal`
  );

  // Rule 3c, the CREATE path under a linked ancestor (Phase 219, item 1).
  check(
    live.create.ancestorLink,
    `${TAG} the planted provider root is no longer read as a link, so this probe stopped testing the attack`
  );
  check(
    live.create.rootLinkAncestor,
    `${TAG} a logins root that is a link is not read as one`
  );
  check(!live.create.linkedOk, `${TAG} ADD LOGIN CREATED A FOLDER THROUGH A LINKED PROVIDER ROOT`);
  check(
    live.create.victimEntries === 0,
    `${TAG} add login left ${String(live.create.victimEntries)} folder(s) in a directory Tortie does not own`
  );
  check(
    (live.create.linkedReason ?? '').length > 0,
    `${TAG} add login refused a linked root with no sentence`
  );
  check(
    live.create.plainOk && live.create.plainDirOwned && !live.create.plainAncestor,
    `${TAG} add login refused an ORDINARY root, so the guard above proves nothing`
  );
  check(
    !live.create.absentAncestor,
    `${TAG} a provider root that is not there yet reads as a link, so no login could ever be created`
  );

  // Rule 3c2, THE SWEEP DRIVEN UNDER A LINKED PROVIDER ROOT (Phase 219's fix
  // round). Rule 3c above asks the PREDICATE and rule 3d below drives the
  // sweep over plain roots. Neither drove the sweep under a link, so the guard
  // inside `strayLoginIds` was pinned only by this gate's own ablation text:
  // taken out by hand, every live rule here stayed green. These four are the
  // behaviour, and the second of them is the door `finishStraysOnce` reaches
  // with ids that never pass through `strayLoginIds` at all.
  check(
    live.sweepLinked.strays.length === 0,
    `${TAG} A LINKED PROVIDER ROOT WAS WALKED FOR STRAYS: ${JSON.stringify(live.sweepLinked.strays)}`
  );
  check(
    !live.sweepLinked.aimed,
    `${TAG} THE STRAY REMOVE ACCEPTED AN ID UNDER A LINKED PROVIDER ROOT, so a delete reached a directory Tortie does not own`
  );
  check(
    live.sweepLinked.credentialSurvives && live.sweepLinked.victimEntries === 1,
    `${TAG} THE SWEEP DELETED SOMEBODY ELSE'S DIRECTORY THROUGH A LINKED ROOT: ${String(live.sweepLinked.victimEntries)} entries left, credential ${String(live.sweepLinked.credentialSurvives)}`
  );
  check(
    live.sweepLinked.plain.strays.length === 1 &&
      live.sweepLinked.plain.removed &&
      live.sweepLinked.plain.gone,
    `${TAG} the SAME planted directory under a root with no link was not swept, so the refusals above turned the sweep off rather than making it careful: ${JSON.stringify(live.sweepLinked.plain)}`
  );

  // Rule 3d, a record row Tortie did not write (Phase 219, item 3).
  check(
    live.numeric.known === null,
    `${TAG} a record holding a NUMERIC id answered a set rather than null, so it authorised a sweep`
  );
  check(
    live.numeric.strays.length === 0,
    `${TAG} A HAND EDITED RECORD MADE A NAMED LOGIN A STRAY: ${JSON.stringify(live.numeric.strays)}`
  );
  check(
    live.numeric.credentialSurvives,
    `${TAG} THE SWEEP DELETED A CREDENTIAL BECAUSE A ROW'S ID WAS A NUMBER`
  );
  check(live.numeric.namedFolderSurvives, `${TAG} the sweep deleted a folder the record names`);
  for (const shape of live.numeric.otherShapes) {
    check(
      shape.known === null && shape.strays === 0,
      `${TAG} a record row spelled ${shape.row} was skipped rather than refused, and it swept ${String(shape.strays)}`
    );
  }
  check(
    live.numeric.sweepStrays.length === 1 && live.numeric.sweepKnown === 1,
    `${TAG} a WELL FORMED record named no stray, so the refusals above prove nothing`
  );

  check(live.chosen.owned, `${TAG} a chosen login resolved to a directory Tortie does not own`);
  check(live.defaultLogin.dir === null, `${TAG} the default login composed a directory`);
  check(live.defaultLogin.name === null, `${TAG} the default login was named on the wire`);

  // Rule 4.
  check(live.leak.login === 'Work', `${TAG} the row did not record the login name`);
  check(!live.leak.tokenInRow, `${TAG} A TOKEN BYTE REACHED THE MANIFEST ROW`);
  check(!live.leak.tokenInArgv, `${TAG} A TOKEN BYTE REACHED THE ARGV`);
  check(!live.leak.tokenInResumeArgv, `${TAG} A TOKEN BYTE REACHED THE RESUME ARGV`);
  check(!live.leak.tokenInPaneEnv, `${TAG} A TOKEN BYTE REACHED THE PANE ENVIRONMENT`);
  check(!live.leak.dirInRow, `${TAG} the login directory reached the manifest row`);
  check(!live.leak.dirInArgv, `${TAG} the login directory reached the argv`);
  check(!live.leak.dirInRowEnv, `${TAG} the login directory reached the row own env column`);
  check(live.leak.paneEnvDir, `${TAG} the pane did not carry the chosen login directory`);
  check(live.leak.paneStamp, `${TAG} a login layer displaced the session identity stamp`);

  // Rule 5.
  check(live.hash.equal, `${TAG} THE CONFIRM HASH MOVED FOR A LOGIN CHOICE`);
  check(
    live.hash.movedWhenEnvGrows,
    `${TAG} the confirm hash did not move when launch.env grew, so the check above proves nothing`
  );
  check(
    !live.hash.fieldKeys.includes('login'),
    `${TAG} the execution fields carry a login, so an entry can see one`
  );

  // Rule 6.
  check(live.gone.fellBack, `${TAG} a chosen login whose folder is gone did not fall back`);
  check(live.gone.dir === null, `${TAG} a chosen login whose folder is gone still named a directory`);
  check(live.gone.asked === 'Work', `${TAG} the fallback did not name the login it could not honour`);
  check(!live.file.hasToken, `${TAG} A TOKEN BYTE REACHED THE LOGINS FILE`);
  check(!live.file.hasSeparator, `${TAG} the logins file holds a path`);
  check(!live.file.hasHome, `${TAG} the logins file names a default location`);

  // Rule 8, THE FIRST DEFECT THE OPERATOR REPORTED.
  check(
    live.presence.keychainOnly,
    `${TAG} A LOGIN WHOSE CREDENTIAL IS ONLY IN THE KEYCHAIN READ AS NOT SIGNED IN, which is the defect of 2026-09-02 back again`
  );
  check(live.presence.fileOnly, `${TAG} a login with a credentials file read as absent`);
  check(!live.presence.neither, `${TAG} a login with no credential at all read as present`);
  check(live.presence.codexFile, `${TAG} a codex login with an auth file read as absent`);
  check(!live.presence.codexNone, `${TAG} a codex login with no file read as present`);
  check(
    live.presence.askedForLogin.length === 1,
    `${TAG} A SECOND LOGIN ASKED FOR ${String(live.presence.askedForLogin.length)} KEYCHAIN ITEMS, so it can read the person's own default credential and call the numbers its own`
  );
  // Phase 281: each ask is a (service, account) pair now, and the account is
  // rule 13's business; this check is still about the plain NAME.
  check(
    live.presence.askedForDefault.some((pair) => pair?.[0] === 'Claude Code-credentials'),
    `${TAG} the default login did not ask for the plain keychain item, which is what a default install actually has`
  );
  // RE-DERIVED HERE, by this file's own hash, rather than trusted.
  const wantScoped = `Claude Code-credentials-${createHash('sha256')
    .update(live.presence.dir)
    .digest('hex')
    .slice(0, 8)}`;
  check(
    live.presence.scoped === wantScoped,
    `${TAG} the scoped service name is ${live.presence.scoped} and this file derives ${wantScoped} from the same directory`
  );
  check(
    live.presence.askedForLogin[0]?.[0] === wantScoped,
    `${TAG} the item asked for is not the one the directory derives`
  );
  check(
    live.presence.wholeListPresent,
    `${TAG} THE LIST STILL ANSWERS THE FILE HALF, so a signed in login reads as never signed in`
  );
  check(
    !live.presence.cheapListPresent,
    `${TAG} the cheap file only list answered present, so this gate is no longer showing the defect the whole list fixes`
  );
  check(
    !live.presence.goneListPresent,
    `${TAG} a login whose folder is gone was asked about, and a Remove leaves the scoped keychain item behind for ever`
  );

  // Rule 9, THE SECOND DEFECT.
  check(
    live.account.claude.kind === 'known',
    `${TAG} a claude login with an address in its own file was not known`
  );
  check(
    live.account.codex.kind === 'known',
    `${TAG} CODEX PARITY IS GONE: the address in the id token email claim was not read`
  );
  check(
    live.account.fresh.kind === 'unknown',
    `${TAG} a login that has taken no turn was given an account it does not have`
  );
  check(live.account.missing.kind === 'unknown', `${TAG} a missing file named an account`);
  check(
    live.account.markup.kind === 'unknown',
    `${TAG} AN ADDRESS FIELD HOLDING MARKUP REACHED A FACE`
  );
  check(
    live.account.notJson.kind === 'unknown',
    `${TAG} a file that is not JSON was a crash or an account rather than not known`
  );
  check(!live.account.tokenInAnswer, `${TAG} A TOKEN BYTE REACHED THE ACCOUNT ANSWER`);
  check(
    live.account.decoyAccountFile !== live.account.decoyCredentialFile,
    `${TAG} the default account file and the default credential file are the same path`
  );
  check(
    live.account.decoyAccountFile === '/h/.claude.json',
    `${TAG} THE DEFAULT ACCOUNT FILE IS ${live.account.decoyAccountFile}, and the decoy at /h/.claude/.claude.json holds no account, so the default login would read as not known`
  );
  check(
    live.account.scopedAccountFile === '/d/x/.claude.json',
    `${TAG} a login's own account file is not inside the login's own directory`
  );

  notes.push(
    `${String(live.owned.length)} ownership shapes, ${String(live.hostile.problems)} rows dropped whole, hash ${live.hash.before.slice(0, 12)} before and after`
  );
  notes.push(
    `presence keychain ${String(live.presence.keychainOnly)} against file ${String(live.presence.cheapListPresent)}, one item asked per login, both providers name an account`
  );

  // Rules 13, 15, 16 and 17, driven.
  const driven = vendorFindings(live.vendor);
  for (const f of driven) failures.push(f.sentence);
  if (driven.length === 0) {
    notes.push(
      `the one vendor name asked under ${String(live.vendor.accounts.vendor)} by presence, the meter and the shipping keychainReader; branch B missing under both accounts; exit 44 null and 36, 1 and a failed start thrown; a decomposed directory named ${live.vendor.nfc.scoped}`
    );
  }

  // -------------------------------------------------------------------------
  // Rule 19 (Phase 287, narrowed by Phase 304), the driven half. NO ROW
  // CARRIES A SIZE. Phase 287 put a `tooLarge` field on the row because
  // Tortie's own keychain vault could refuse a keep and the row was the only
  // place a person could be told; since Phase 304 that vault is a sealed file
  // with no ceiling, the only store that can refuse for size is the agent's
  // own keychain entry, and it refuses at a CLICK, where the choose handler's
  // `why` and the two sentences below are what a person reads. A row that
  // carried a size again would be a row promising something about a store it
  // never tried to write, which is the sentence Phase 287's verify and
  // reverify both found blaming the wrong store.
  // -------------------------------------------------------------------------
  const tl = live.tooLarge;
  check(
    tl !== undefined && tl !== null && tl.absent !== true,
    `${TAG} RULE 19 CANNOT RUN: the probe gave no Phase 287 readings`
  );
  if (tl !== undefined && tl !== null && tl.absent !== true) {
    check(
      tl.rowsRead === 2 && tl.rowCarriesSize === false,
      `${TAG} A ROW CARRIES A SIZE: over an ask that answered tooLarge, ${String(tl.rowsRead)} rows were read and ${tl.rowCarriesSize ? 'one carries the field' : 'none carries it'}; since Phase 304 no store a row describes can refuse for size, so a row that says so is describing a store it never tried to write`
    );
    check(
      tl.drawsRule === 'undefined' && tl.label === 'undefined' && tl.signedInTail === 'undefined',
      `${TAG} the words file still exports the Phase 287 row-label family (${JSON.stringify({ loginDrawsTooLarge: tl.drawsRule, LOGIN_TOO_LARGE: tl.label, LOGIN_TOO_LARGE_SIGNED_IN: tl.signedInTail })}), which Phase 304 removed with the case: every fact that fed it began in the vault write's refusal`
    );
    check(
      tl.copyNamesTooLarge === false,
      `${TAG} the words file names a tooLarge field in its code, so some surface is still being handed a size that no store a row describes can refuse for`
    );
    check(
      typeof tl.words.refused === 'string' &&
        tl.words.refused.length > 0 &&
        typeof tl.words.running === 'string' &&
        tl.words.running.length > 0 &&
        tl.words.refused !== tl.words.running,
      `${TAG} the two surviving sentences are not two non-empty distinct strings: ${JSON.stringify(tl.words)}`
    );
    // THE p181 RULE, asked here too: no standalone "it" a person has to
    // resolve, in either sentence. `p181-usage-copy.test.ts` is the test that
    // owns this rule over the whole words file; this is the gate's own reading
    // of the two sentences this rule is about.
    for (const [name, sentence] of Object.entries(tl.words)) {
      check(
        !/\bit\b/.test(sentence),
        `${TAG} the ${name} sentence carries a standalone "it": ${JSON.stringify(sentence)}`
      );
    }
    notes.push(
      `no row carries a size over an ask that answers one, the row-label family is gone from the words file, and the 2 surviving sentences are read by value`
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 19 (Phase 287), the scanned half and the handler's own span.
//
// The sentence is in ONE file, and the two files in the credentials domain that
// say it name the constant rather than the words. A second copy of a sentence is
// how two surfaces come to say different things about the same login, which is
// the defect this whole words file was written for.
//
// The choose handler is read by matching braces, the way rule 12 reads it, so a
// `why` somewhere else in `ipc.ts` is not a `why` in this handler. The answered
// return is asked on BOTH arms of its ternary: the arm with no activation
// sentence is exactly the switch that STOOD without writing anything, which is
// the one this reason exists for, and today's line returned it untouched.
// ---------------------------------------------------------------------------

/** Every `.ts` and `.tsx` file under `dir`, tests aside. */
function everySourceUnder(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name.startsWith('.')) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...everySourceUnder(path));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(path);
  }
  return out;
}

/** The text of the block whose `{` is at `open`, braces matched. */
function blockTextAt(text, open) {
  const close = closeOf(text, open);
  return close < 0 ? '' : text.slice(open, close + 1);
}

/**
 * Does `logins:choose` carry the named reason out on both of its answers?
 *
 * An arm that is a bare name is followed to the `const` that bound it, because
 * the shipping handler binds the answer once and then decorates it, and a reading
 * that only looked at the return expression would call that a drop.
 */
function chooseWhyReading(text) {
  const span = handlerSpanOf(text, 'logins:choose');
  if (span === null) {
    return { span: false, namesPutWhy: false, refusal: false, answered: false };
  }
  const namesPutWhy = /\bput\.why\b/.test(span);
  let refusal = false;
  const at = span.indexOf('if (!put.ok) {');
  if (at >= 0) {
    const block = blockTextAt(span, span.indexOf('{', at));
    refusal = /\breason:\s*put\.reason\b/.test(block) && /\bwhy\b/.test(block);
  }
  /**
   * A NAME AND A SPREAD ARE FOLLOWED, and that is not leniency. The shipping
   * handler binds its answer once and then decorates it for the arm that carries
   * an activation sentence, so a reading that looked only at the return
   * expression would call `{ ...told, reason: activation }` a drop. Three hops
   * is far more than any shape here needs and stops a self reference looping.
   */
  const carries = (arm, depth = 0) => {
    const text = arm.trim();
    if (/\bwhy\b/.test(text)) return true;
    if (depth > 3) return false;
    const names = [];
    const bare = /^([A-Za-z_$][\w$]*)$/.exec(text)?.[1];
    if (bare !== undefined) names.push(bare);
    for (const m of text.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)) names.push(m[1]);
    return names.some((name) => {
      const bound = new RegExp(`\\b(?:const|let)\\s+${name}\\s*=`).exec(span);
      if (bound === null) return false;
      return ternaryArms(statementAt(span, bound.index + bound[0].length)).some(
        (next) => carries(next, depth + 1)
      );
    });
  };
  const last = span.lastIndexOf('return ');
  const answered =
    last < 0
      ? false
      : ternaryArms(statementAt(span, last + 'return '.length)).every(carries);
  return { span: true, namesPutWhy, refusal, answered };
}

{
  const CHOOSE_WHY_FIXTURES = [
    {
      name: 'the shipping shape, bound once and decorated',
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  let why = null;\n  const put = await activateLogin(d, p, n);\n  if (!put.ok) {\n    return { ok: false, reason: put.reason, ...(put.why === undefined ? {} : { why: put.why }), snapshot: await wholeList() };\n  }\n  why = put.why ?? null;\n  const told = why === null ? result : { ...result, why };\n  return activation === null || !result.ok ? told : { ...told, reason: activation };\n});\nhandle(ipc, 'logins:remove', () => 1);\n",
      want: { span: true, namesPutWhy: true, refusal: true, answered: true }
    },
    {
      name: 'the reason dropped from the refusal',
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  let why = null;\n  const put = await activateLogin(d, p, n);\n  if (!put.ok) {\n    return { ok: false, reason: put.reason, snapshot: await wholeList() };\n  }\n  why = put.why ?? null;\n  const told = why === null ? result : { ...result, why };\n  return activation === null || !result.ok ? told : { ...told, reason: activation };\n});\nhandle(ipc, 'logins:remove', () => 1);\n",
      want: { span: true, namesPutWhy: true, refusal: false, answered: true }
    },
    {
      name: 'the arm with no activation sentence left untouched',
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  let why = null;\n  const put = await activateLogin(d, p, n);\n  if (!put.ok) {\n    return { ok: false, reason: put.reason, ...(put.why === undefined ? {} : { why: put.why }), snapshot: await wholeList() };\n  }\n  why = put.why ?? null;\n  return activation === null || !result.ok ? result : { ...result, reason: activation, why };\n});\nhandle(ipc, 'logins:remove', () => 1);\n",
      want: { span: true, namesPutWhy: true, refusal: true, answered: false }
    },
    {
      name: 'a reason invented here rather than read from the activation',
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  const why = 'too-large';\n  const put = await activateLogin(d, p, n);\n  if (!put.ok) {\n    return { ok: false, reason: put.reason, why, snapshot: await wholeList() };\n  }\n  return { ...result, why };\n});\nhandle(ipc, 'logins:remove', () => 1);\n",
      want: { span: true, namesPutWhy: false, refusal: true, answered: true }
    },
    {
      name: "a `why` in ANOTHER handler is not a `why` in this one",
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  const put = await activateLogin(d, p, n);\n  if (!put.ok) {\n    return { ok: false, reason: put.reason, snapshot: await wholeList() };\n  }\n  return result;\n});\nhandle(ipc, 'logins:remove', async () => {\n  const put = await forget();\n  if (!put.ok) {\n    return { ok: false, reason: put.reason, why: put.why };\n  }\n  return { ...result, why: put.why };\n});\n",
      want: { span: true, namesPutWhy: false, refusal: false, answered: false }
    },
    {
      name: 'no such handler at all',
      text: "handle(ipc, 'logins:remove', () => 1);\n",
      want: { span: false, namesPutWhy: false, refusal: false, answered: false }
    }
  ];
  let behaved = 0;
  for (const f of CHOOSE_WHY_FIXTURES) {
    const got = chooseWhyReading(f.text);
    if (JSON.stringify(got) === JSON.stringify(f.want)) behaved += 1;
    else
      failures.push(
        `${TAG} the choose-reason scanner misread the fixture "${f.name}": ${JSON.stringify(got)} (want ${JSON.stringify(f.want)})`
      );
  }
  notes.push(
    `${String(behaved)} of ${String(CHOOSE_WHY_FIXTURES.length)} choose-reason fixtures behaved`
  );
}

const liveChooseWhy = chooseWhyReading(readFileSync(join(DOMAIN, 'ipc.ts'), 'utf8'));
check(
  liveChooseWhy.span && liveChooseWhy.namesPutWhy,
  `${TAG} the logins:choose handler does not read the reason from the activation's own answer, so whatever it carries is something this handler decided`
);
check(
  liveChooseWhy.refusal,
  `${TAG} THE REFUSED SWITCH CARRIES NO NAMED REASON: logins:choose's refusal answers the sentence alone, so the surface that draws it cannot tell this refusal from any other and says nothing a person can act on`
);
check(
  liveChooseWhy.answered,
  `${TAG} THE SWITCH THAT STOOD CARRIES NO NAMED REASON on one of its two arms, and the arm with no activation sentence is exactly the one the reason exists for: a switch that was recorded while the running session was deliberately not moved`
);
{
  const sentence =
    /export const LOGIN_TOO_LARGE_SENTENCE\s*=\s*\n?\s*'([^']*)'/.exec(
      readFileSync(join(SHARED, 'login-copy.ts'), 'utf8')
    )?.[1] ?? null;
  check(
    sentence !== null,
    `${TAG} src/shared/login-copy.ts declares no LOGIN_TOO_LARGE_SENTENCE, so rule 19 has no sentence to hold anything to`
  );
  if (sentence !== null) {
    const saying = everySourceUnder(join(repoRoot, 'src'))
      .filter((file) => readFileSync(file, 'utf8').includes(sentence))
      .map((file) => file.slice(repoRoot.length + 1))
      .sort();
    check(
      JSON.stringify(saying) === JSON.stringify(['src/shared/login-copy.ts']),
      `${TAG} the words of the too-large sentence appear in ${saying.join(', ')} rather than in the words file alone, and a second copy of a sentence is how two surfaces come to say different things about one login`
    );
    // PHASE 304. ONE WRITER NAMES THE CONSTANT, being the one write in
    // `swap.ts` that the vendor's keychain item is written through. `keep.ts`
    // named it too while Tortie's own vault could refuse; now every refusal
    // that says the sentence begins in `safeSwap`'s catch, and a second
    // composer in `keep.ts` would be a refusal blaming a store that cannot
    // refuse for size any more.
    check(
      readFileSync(join(CREDENTIALS_DOMAIN, 'swap.ts'), 'utf8').includes(
        'LOGIN_TOO_LARGE_SENTENCE'
      ),
      `${TAG} src/main/credentials/swap.ts does not name LOGIN_TOO_LARGE_SENTENCE, so either it says the words itself or the refusal it composes is not the one a surface draws`
    );
    check(
      !readFileSync(join(CREDENTIALS_DOMAIN, 'keep.ts'), 'utf8').includes(
        'LOGIN_TOO_LARGE_SENTENCE'
      ),
      `${TAG} src/main/credentials/keep.ts names LOGIN_TOO_LARGE_SENTENCE, so a refusal for size is composed somewhere other than the one write, for a store that since Phase 304 cannot refuse for size`
    );
    notes.push('the too-large sentence is in the words file alone and named by the one writer');
  }
}

// The ablations. Each one must change the verdict.
/**
 * The ablations, and why two of them carry more than one edit.
 *
 * THE DOMAIN GUARDS EVERY PATH TWICE, once where a row is read and once in
 * front of the write or the delete, so removing either guard on its own leaves
 * the other one doing the job and changes nothing a person could see. That is
 * the design working. It also means a single edit ablation for those two rules
 * would be green for the right reason and would prove nothing, so the ablation
 * that tests the SECOND guard removes the first one as well and then asks
 * whether the second still holds. Ablation 3 removes both and must reach the
 * planted directory; ablation 2 removes only the first and must be caught by
 * the second, which shows up as a different refusal sentence.
 */
const READER_GUARDS = [
  {
    file: 'store.ts',
    from: "if (typeof id !== 'string' || !LOGIN_ID_RE.test(id)) {",
    to: "if (typeof id !== 'string') {"
  },
  {
    file: 'store.ts',
    from:
      "      if (loginDirOnDisk(root, provider, loginDirIn(root, provider, id)) === 'escapes') {",
    to: '      if (false) {'
  }
];

/**
 * Phase 203's ablations, over the ACCOUNT READER rather than the store.
 *
 * Each is one clause, and each must change at least one reading above. They
 * are written as the mistake a later round would actually make rather than as
 * a deletion nobody would write: the payload flag added back, the plain
 * keychain item allowed for a second login, the default account file composed
 * the way the credential file is, the address filter dropped, and the id token
 * claim stopped being read.
 */
const ABLATIONS = [
  {
    // PHASE 281 RE-ANCHORED THIS on the one ask `readLoginPresence` makes now,
    // since the `claudeServicesFor` loop it used to remove is gone.
    name: 'the keychain half taken out of presence, which is the reported defect',
    dir: 'usage',
    edits: [
      {
        file: 'login-accounts.ts',
        from: '    if (await d.keychainHas(service, account)) return true;\n',
        to: ''
      }
    ]
  },
  {
    // PHASE 281 RE-EXPRESSED THIS. The login branch of `claudeServicesFor` it
    // anchored on is gone, so the same mistake is written where it would now
    // be made: a second ask, of the plain name, after the login's own.
    name: 'a second login allowed to fall through to the plain keychain item',
    dir: 'usage',
    edits: [
      {
        file: 'login-accounts.ts',
        from: "import { claudeKeychainAccount, claudeKeychainService } from './credentials';",
        to: "import { CLAUDE_KEYCHAIN_SERVICE, claudeKeychainAccount, claudeKeychainService } from './credentials';"
      },
      {
        file: 'login-accounts.ts',
        from: '    if (await d.keychainHas(service, account)) return true;\n',
        to:
          '    if (await d.keychainHas(service, account)) return true;\n' +
          '    if (await d.keychainHas(CLAUDE_KEYCHAIN_SERVICE, account)) return true;\n'
      }
    ]
  },
  {
    name: 'the default account file composed the way the credential file is, which is the decoy',
    dir: 'usage',
    edits: [
      {
        file: 'login-accounts.ts',
        from:
          "  const own = d.env['CLAUDE_CONFIG_DIR'];\n" +
          "  return own !== undefined && own !== ''\n" +
          "    ? join(own, '.claude.json')\n" +
          "    : join(d.home, '.claude.json');",
        to:
          "  const own = d.env['CLAUDE_CONFIG_DIR'];\n" +
          "  const dir = own !== undefined && own !== '' ? own : join(d.home, '.claude');\n" +
          "  return join(dir, '.claude.json');"
      }
    ]
  },
  {
    name: 'the address filter dropped, so a field holding markup is drawn',
    dir: 'usage',
    edits: [
      {
        file: 'login-accounts.ts',
        from: '  return ACCOUNT_EMAIL_RE.test(email) ? email : null;',
        to: '  return email;'
      }
    ]
  },
  {
    name: 'the id token email claim stopped being read, so codex parity goes',
    dir: 'usage',
    edits: [
      {
        file: 'login-accounts.ts',
        from:
          "  const plain = sanitizeAccountEmail(claims['email']);\n" +
          '  if (plain !== null) return plain;',
        to: ''
      }
    ]
  },
  {
    // PHASE 287 RE-ANCHORED IT, and PHASE 304 RE-ANCHORED IT BACK to the
    // parent's text, because the `tooLarge: false` Phase 287 added to this
    // literal is gone with the row field. What it proves did not change
    // either time, and an unmatched `from` is a gate failure rather than a
    // red ablation. A folder that is gone is still never asked about.
    name: 'a login whose folder is gone asked about anyway',
    dir: 'logins',
    edits: [
      {
        file: 'store.ts',
        from:
          '      const facts =\n' +
          "        loginDirOnDisk(root, provider, dir) === 'ok'\n" +
          '          ? await asked(provider, dir, row.id)\n' +
          '          : { present: false, email: null, kept: false, restores: false };',
        to: '      const facts = await asked(provider, dir, row.id);'
      }
    ]
  },
  // -------------------------------------------------------------------------
  // PHASE 287, rule 19, as PHASE 304 left it: the choice that carries no
  // reason. The two ablations beside it, the default row not told and the
  // finished sign in no longer saying, are gone with the row field they
  // ablated, because every fact that fed that field began in the vault
  // write's refusal and the vault cannot refuse for size any more.
  // -------------------------------------------------------------------------
  {
    name: 'the refused choice carries no named reason',
    dir: 'logins',
    edits: [
      {
        file: 'ipc.ts',
        from: '          ...(put.why === undefined ? {} : { why: put.why }),\n',
        to: ''
      }
    ]
  },
  {
    // PHASE 304. A size put back on the row, which is the shape Phase 287
    // shipped and its own reverify found blaming the wrong store: the words
    // file exporting the drawing rule again moves rule 19's reading.
    name: 'a size put back on the row, so a surface can blame a store that cannot refuse',
    dir: 'logins',
    edits: [
      {
        file: 'login-copy.ts',
        from: 'export const LOGIN_TOO_LARGE_SENTENCE =',
        to:
          "export const LOGIN_TOO_LARGE = 'Too large for Tortie to keep';\n" +
          'export function loginDrawsTooLarge(row: { tooLarge?: boolean; kept: boolean; isDefault: boolean }): boolean {\n' +
          '  return row.tooLarge === true && row.kept && !row.isDefault;\n' +
          '}\n' +
          'export const LOGIN_TOO_LARGE_SENTENCE ='
      }
    ]
  },
  {
    name: 'the containment test taken out of the ownership rule',
    edits: [
      {
        file: 'dirs.ts',
        from: 'if (!full.startsWith(prefix)) return false;',
        to: ''
      }
    ]
  },
  {
    name: 'both drop rules taken out of the file reader',
    edits: READER_GUARDS
  },
  {
    name: 'the drop rules AND the ownership guard on the remove taken out',
    edits: [
      ...READER_GUARDS,
      {
        file: 'store.ts',
        from:
          "  if (!isOwnedLoginDir(root, provider, dir)) {\n" +
          "    return {\n" +
          "      ok: false,\n" +
          "      reason: 'Tortie refused to remove a folder outside its own data.'\n" +
          '    };\n  }',
        to: ''
      }
    ]
  },
  {
    name: 'the link tests taken out of the disk rule, so an entry that is a link is a folder',
    edits: [
      {
        file: 'dirs.ts',
        from: '    present = lstatSync(dir).isDirectory();',
        to: '    present = lstatSync(dir).isDirectory() || lstatSync(dir).isSymbolicLink();'
      },
      {
        file: 'dirs.ts',
        from:
          '    const realBase = realpathSync(base);\n' +
          '    const realDir = realpathSync(dir);\n' +
          '    const prefix = realBase.endsWith(sep) ? realBase : realBase + sep;\n' +
          "    if (!realDir.startsWith(prefix)) return 'escapes';\n" +
          '    const rest = realDir.slice(prefix.length);\n' +
          "    if (rest.length === 0 || rest.includes(sep)) return 'escapes';",
        to: '    realpathSync(base);'
      }
    ]
  },
  {
    name: 'the link drop taken out of the reader AND the disk rule out of the resolver',
    edits: [
      // THE DOMAIN GUARDS EVERY PATH TWICE, so this ablation removes the
      // first guard as well and then asks whether the second still holds.
      // Removing the resolver's rule alone changes nothing a person could
      // see, which is the design working rather than a rule that cannot fail.
      READER_GUARDS[1],
      {
        file: 'store.ts',
        from: "  if (loginDirOnDisk(root, provider, dir) !== 'ok') {",
        to: '  if (!isOwnedLoginDir(root, provider, dir) || !existsSync(dir)) {'
      }
    ]
  },
  {
    name: 'the ancestor guard taken out of the create path, which is the Phase 202 finding',
    edits: [
      {
        file: 'store.ts',
        from:
          '  if (loginAncestorIsLink(root, provider)) {\n' +
          "    return { ok: false, reason: 'Tortie refused a folder reached through a link.' };\n" +
          '  }',
        to: ''
      }
    ]
  },
  {
    name: 'the ancestor guard taken out of the stray sweep, so a linked root is walked',
    edits: [
      {
        file: 'store.ts',
        from: '  if (loginAncestorIsLink(root, provider)) return [];',
        to: ''
      }
    ]
  },
  {
    // THE SECOND DOOR, and the reason this ablation is not the one above it.
    // `finishStraysOnce` reaches this remove with ids from the record's own
    // vault slots, which never pass through `strayLoginIds`, so taking the
    // guard out of one function says nothing about the other.
    name: 'the ancestor guard taken out of the stray REMOVE, so a delete follows a linked root',
    edits: [
      {
        file: 'store.ts',
        from: '  if (loginAncestorIsLink(root, provider)) return false;',
        to: ''
      }
    ]
  },
  {
    name: 'a row Tortie did not write skipped rather than refused, which is the Phase 206 finding',
    edits: [
      {
        file: 'store.ts',
        from:
          '    ) {\n' +
          '      return null;\n' +
          '    }\n' +
          "    known.add((raw as Record<string, unknown>)['id'] as string);",
        to:
          '    ) {\n' +
          '      continue;\n' +
          '    }\n' +
          "    known.add((raw as Record<string, unknown>)['id'] as string);"
      }
    ]
  },
  {
    name: 'the existence test taken out of the resolver, so a gone folder still resolves',
    edits: [
      {
        file: 'store.ts',
        from: "  if (loginDirOnDisk(root, provider, dir) !== 'ok') {",
        to: '  if (!isOwnedLoginDir(root, provider, dir)) {'
      }
    ]
  },

  // -------------------------------------------------------------------------
  // PHASE 281. Each of these OWNS A RULE, and it counts only if THAT rule goes
  // red over the ablated copy, read from the source and from the probe alike.
  // A clause that moved some other reading has not shown its own rule can
  // fail.
  // -------------------------------------------------------------------------
  {
    name: "the account dropped from the meter's keychainReader argv",
    rule: 13,
    dir: 'usage',
    edits: [
      {
        file: 'credentials.ts',
        from: "          ['find-generic-password', '-a', account, '-s', service, '-w'],",
        to: "          ['find-generic-password', '-s', service, '-w'],"
      }
    ]
  },
  {
    name: "the account dropped from the presence check's argv",
    rule: 13,
    dir: 'usage',
    edits: [
      {
        file: 'login-accounts.ts',
        from: "          ['find-generic-password', '-a', account, '-s', service],",
        to: "          ['find-generic-password', '-s', service],"
      }
    ]
  },
  {
    name: 'the account dropped from the presence seam call',
    rule: 13,
    dir: 'usage',
    edits: [
      {
        file: 'login-accounts.ts',
        from: '    if (await d.keychainHas(service, account)) return true;',
        to: '    if (await d.keychainHas(service)) return true;'
      }
    ]
  },
  {
    name: "the account dropped from the meter's seam call",
    rule: 13,
    dir: 'usage',
    edits: [
      {
        file: 'credentials.ts',
        from: '    payload = await deps.keychain(service, account);',
        to: '    payload = await deps.keychain(service);'
      }
    ]
  },
  {
    name: 'the plain fallback put back after the scoped name in the service function',
    rule: 14,
    dir: 'usage',
    edits: [
      {
        file: 'credentials.ts',
        from:
          "  return own !== undefined && own !== ''\n" +
          '    ? claudeScopedService(own)\n' +
          '    : CLAUDE_KEYCHAIN_SERVICE;',
        to:
          "  return own !== undefined && own !== ''\n" +
          '    ? [claudeScopedService(own), CLAUDE_KEYCHAIN_SERVICE]\n' +
          '    : CLAUDE_KEYCHAIN_SERVICE;'
      }
    ]
  },
  {
    name: 'the meter asking the plain name after the one name, which is branch B read wrong',
    rule: 15,
    dir: 'usage',
    edits: [
      {
        file: 'credentials.ts',
        from: '    payload = await deps.keychain(service, account);',
        to:
          '    payload = await deps.keychain(service, account);\n' +
          '    if (payload === null) payload = await deps.keychain(CLAUDE_KEYCHAIN_SERVICE, account);'
      }
    ]
  },
  {
    name: 'exit 36 treated as absent, the way Claude Code itself reads it',
    rule: 16,
    dir: 'usage',
    edits: [
      {
        file: 'credentials.ts',
        from: '        if (answered && run.code === KEYCHAIN_EXIT_NOT_FOUND) return null;',
        to: '        if (answered && (run.code === KEYCHAIN_EXIT_NOT_FOUND || run.code === 36)) return null;'
      }
    ]
  },
  {
    name: 'the NFC normalisation taken out of the scoped hash',
    rule: 17,
    dir: 'usage',
    edits: [
      {
        file: 'credentials.ts',
        from: "    .update(configDir.normalize('NFC'))",
        to: '    .update(configDir)'
      }
    ]
  },
  {
    // PHASE 281.1. The named exception widened in silence: a chosen login made
    // to follow the vendor's mI under the variable, which is the follow-up
    // SPEC §8 names for `loginPaneEnv` and NOT for this function. Rule 18 must
    // see the empty and the set rows move.
    name: 'a chosen login made to follow CLAUDE_SECURESTORAGE_CONFIG_DIR, so the pinned exception moves',
    rule: 18,
    dir: 'usage',
    edits: [
      {
        file: 'credentials.ts',
        from: "  if (loginDir !== null && loginDir !== '') return claudeScopedService(loginDir);\n  const secure = env['CLAUDE_SECURESTORAGE_CONFIG_DIR'];",
        to: "  const secure = env['CLAUDE_SECURESTORAGE_CONFIG_DIR'];\n  if (loginDir !== null && loginDir !== '' && secure === undefined) return claudeScopedService(loginDir);"
      }
    ]
  }
];

/**
 * THE ABLATED COPIES LIVE ONE LEVEL UNDER `src/main/`, and the depth is exact
 * (Phase 281).
 *
 * Until Phase 281 they went to the system temporary directory. Since Phase
 * 200 the usage copy's `credentials.ts` imports `../proc/guarded`, and since
 * Phase 281 `../credentials/security-print`, and neither resolves from there.
 * So the probe died on its imports under EVERY ablation, its verdict read
 * `['error']`, that differed from the live one, and each ablation counted as
 * red. Measured twice over PRISTINE copies in the temporary directory: at
 * `cc337e67` the probe exits non-zero with `Cannot find module
 * '../proc/guarded'`, and with Phase 281's code in place it exits 1 with
 * `Cannot find module '../credentials/security-print'`. Sixteen red
 * ablations, none of them for the reason its name gave.
 *
 * So each copy is a SIBLING of `logins/` and `usage/`, named with a dot so
 * neither TypeScript's include globs nor the test runner picks it up, removed
 * in the `finally` below whatever happened, exactly as
 * build/conformance-credentials.mjs already places its own. Before any
 * ablation counts, an UNEDITED copy must read exactly what the tree reads,
 * and a probe that cannot run over an edited copy is a finding rather than a
 * red.
 */
const ABLATION_PREFIX = `.p202-ablation-${process.pid.toString(36)}-`;
const mainDir = join(repoRoot, 'src/main');
const LOGINS_COPIED = ['dirs.ts', 'store.ts', 'paths.ts', 'session.ts', 'index.ts', 'ipc.ts'];
const USAGE_COPIED = ['login-accounts.ts', 'credentials.ts'];
/**
 * PHASE 287. The words file, staged INTO the logins copy rather than into a
 * third directory: it imports nothing at runtime, its one import being a type,
 * so it resolves wherever it is put, and a dot-named sibling of `logins/` is
 * outside TypeScript's include globs and the test runner's the same way the
 * copies already are.
 */
const SHARED_COPIED = ['login-copy.ts'];

function sweepAblations() {
  for (const name of readdirSync(mainDir)) {
    if (name.startsWith(ABLATION_PREFIX)) {
      rmSync(join(mainDir, name), { recursive: true, force: true });
    }
  }
}

/** Both domains copied, every time, so an ablation of either runs against the shipping other. */
function stageCopies(tag) {
  const loginsDir = join(mainDir, `${ABLATION_PREFIX}${tag}-logins`);
  const usageDir = join(mainDir, `${ABLATION_PREFIX}${tag}-usage`);
  mkdirSync(loginsDir, { recursive: true });
  mkdirSync(usageDir, { recursive: true });
  for (const f of LOGINS_COPIED) cpSync(join(DOMAIN, f), join(loginsDir, f));
  for (const f of USAGE_COPIED) cpSync(join(USAGE, f), join(usageDir, f));
  for (const f of SHARED_COPIED) cpSync(join(SHARED, f), join(loginsDir, f));
  return { loginsDir, usageDir };
}

/** The sha256 of every shipping file an ablation copies, so a leak into the tree is caught. */
function shippingDigest() {
  const hash = createHash('sha256');
  for (const f of LOGINS_COPIED) hash.update(readFileSync(join(DOMAIN, f)));
  for (const f of USAGE_COPIED) hash.update(readFileSync(join(USAGE, f)));
  for (const f of SHARED_COPIED) hash.update(readFileSync(join(SHARED, f)));
  return hash.digest('hex');
}

/** Every Phase 281 finding over one copy of the usage files and the probe run over it. */
function phase281FindingsOver(usageDir, probe) {
  return [...sourceFindings(usageDir), ...('error' in probe ? [] : vendorFindings(probe.vendor))];
}

const digestBefore = shippingDigest();
const liveChooseWhyReading = JSON.stringify(liveChooseWhy);
const details = [];
try {
  const liveVerdict = JSON.stringify(verdict(live));
  // THE CONTROL. An unedited copy must read what the tree reads, or every
  // ablation below would be red for a reason that is not its clause.
  const control = stageCopies('control');
  const pristine = runProbe(control.loginsDir, control.usageDir, control.loginsDir);
  let honest = true;
  if ('error' in pristine) {
    honest = false;
    failures.push(
      `${TAG} THE PROBE CANNOT RUN OVER AN UNEDITED COPY, so every ablation would be red for the wrong reason: ${String(pristine.error).slice(0, 300)}`
    );
  } else if (JSON.stringify(verdict(pristine)) !== liveVerdict) {
    honest = false;
    failures.push(`${TAG} an unedited copy reads differently from the tree, so no ablation can be judged against it`);
  } else {
    // The copy must break exactly the Phase 281 rules the tree breaks, which
    // is none on a green tree. Asked as the same sentences rather than as
    // none, so a red tree still has its ablations judged.
    const overCopy = phase281FindingsOver(control.usageDir, pristine).map((f) => f.sentence);
    const overTree = phase281FindingsOver(USAGE, live).map((f) => f.sentence);
    if (JSON.stringify(overCopy) !== JSON.stringify(overTree)) {
      honest = false;
      failures.push(
        `${TAG} an unedited copy reads the Phase 281 rules differently from the tree (${String(overCopy.length)} findings against ${String(overTree.length)}), so no ablation can be judged against it`
      );
    }
  }
  let red = 0;
  for (const [i, ablation] of (honest ? ABLATIONS : []).entries()) {
    const { loginsDir, usageDir } = stageCopies(`a${String(i)}`);
    let applied = true;
    for (const edit of ablation.edits) {
      const target = join(
        (ablation.dir ?? 'logins') === 'usage' ? usageDir : loginsDir,
        edit.file
      );
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
    const ablated = runProbe(loginsDir, usageDir, loginsDir);
    if ('error' in ablated) {
      // A PROBE THAT CANNOT RUN IS NOT AN ABLATION THAT WENT RED, which is
      // exactly how this gate proved nothing from Phase 200 to Phase 281.
      failures.push(
        `${TAG} the ablation "${ablation.name}" stopped the probe running instead of moving a reading, so it proves nothing: ${String(ablated.error).slice(0, 300)}`
      );
      continue;
    }
    if (ablation.rule !== undefined) {
      const found = phase281FindingsOver(usageDir, ablated);
      const rules = [...new Set(found.map((f) => f.rule))].sort((a, b) => a - b);
      const own = found.find((f) => f.rule === ablation.rule);
      if (own !== undefined) {
        red += 1;
        details.push(`${ablation.name} -> rules ${rules.join(', ')}: ${own.sentence}`);
      } else {
        failures.push(
          `${TAG} the ablation "${ablation.name}" did not turn rule ${String(ablation.rule)} red (it moved rules ${rules.join(', ') || 'none'}), so that rule cannot fail`
        );
      }
      continue;
    }
    const got = verdict(ablated);
    const was = verdict(live);
    const moved = VERDICT_PARTS.filter((_, at) => got[at] !== was[at]);
    // RULE 19's HANDLER HALF IS READ FROM SOURCE (Phase 287), because this probe
    // imports no `ipc.ts`: no world it builds can see a reason the registrar
    // drops on its way out of the one channel that writes a credential.
    if (
      JSON.stringify(
        chooseWhyReading(readFileSync(join(loginsDir, 'ipc.ts'), 'utf8'))
      ) !== liveChooseWhyReading
    ) {
      moved.push('chooseReason');
    }
    if (moved.length > 0) {
      red += 1;
      // A CLAUSE OWNS A READING, and naming the one that moved is what lets a
      // reader see it moved for the reason the ablation's name gives.
      details.push(`${ablation.name} -> ${moved.join(', ')}`);
    } else {
      failures.push(
        `${TAG} the ablation "${ablation.name}" changed nothing this gate checks, so that rule cannot fail`
      );
    }
  }
  notes.push(`${String(red)} of ${String(ABLATIONS.length)} ablations went red over sibling copies an unedited copy of which reads what the tree reads`);
} finally {
  sweepAblations();
}
const digestAfter = shippingDigest();
check(
  digestAfter === digestBefore,
  `${TAG} THE SHIPPING SOURCE CHANGED WHILE THE ABLATIONS RAN (sha256 ${digestBefore.slice(0, 12)} before, ${digestAfter.slice(0, 12)} after), so an edit reached the tree rather than a copy`
);
notes.push(`shipping sources sha256 ${digestBefore.slice(0, 12)} before and after`);
if (process.env['P281_ABLATION_DETAIL'] === '1') {
  for (const line of details) process.stdout.write(`${TAG} ablation ${line}\n`);
}

// ---------------------------------------------------------------------------
// Rule 11 (committer's round of Phase 211, the verifier's F4). EVERY CHANGE
// PUSHES `logins:changed`. The window that adds, chooses or removes a login
// gets the snapshot back in its answer; every OTHER window learned of it only
// from the watcher, and a choose on the keychain path moves no file, so the
// Settings window in a second renderer drew the old chosen mark until the
// thirty second backstop, measured at 10,021 ms in the verifier's app run. The
// push is read from the body of the ONE function every change answers
// through, by matching braces, so a push in a comment or in some other
// function does not count, and every change handler must reach that function.
// ---------------------------------------------------------------------------


/** Does the registrar push after every change? */
function pushesAfterEveryChange(text) {
  const answer = functionBodyOf(stripComments(text), 'answer');
  if (answer === null) return false;
  if (!/\bbroadcastEvent\s*\(\s*EVT_LOGINS_CHANGED\s*\)/.test(answer)) return false;
  const body = stripComments(text);
  for (const channel of ['logins:add', 'logins:choose', 'logins:remove']) {
    const at = body.indexOf(`'${channel}'`);
    if (at < 0) return false;
    // The handler runs from its channel name to the next `handle(`; it must
    // reach `answer(` inside that span.
    const next = body.indexOf('handle(', at + 1);
    const span = body.slice(at, next < 0 ? body.length : next);
    if (!/\banswer\s*\(/.test(span)) return false;
  }
  return true;
}

const ipcText = readFileSync(join(DOMAIN, 'ipc.ts'), 'utf8');
check(
  pushesAfterEveryChange(ipcText),
  `${TAG} src/main/logins/ipc.ts does not push logins:changed from the one function every change answers through, so a choose in one window reaches another only from the watcher's backstop`
);
{
  const PUSH_FIXTURES = [
    {
      name: 'a push inside answer, reached by every change',
      text:
        "async function answer(c) {\n  const s = await wholeList();\n  broadcastEvent(EVT_LOGINS_CHANGED);\n  return s;\n}\n" +
        "handle(ipc, 'logins:add', () => answer(a));\nhandle(ipc, 'logins:choose', () => answer(b));\nhandle(ipc, 'logins:remove', () => answer(c));\n",
      pushes: true
    },
    {
      name: 'no push at all',
      text:
        "async function answer(c) {\n  const s = await wholeList();\n  return s;\n}\n" +
        "handle(ipc, 'logins:add', () => answer(a));\nhandle(ipc, 'logins:choose', () => answer(b));\nhandle(ipc, 'logins:remove', () => answer(c));\n",
      pushes: false
    },
    {
      name: 'the push only in a comment',
      text:
        "async function answer(c) {\n  // broadcastEvent(EVT_LOGINS_CHANGED) would go here\n  return wholeList();\n}\n" +
        "handle(ipc, 'logins:add', () => answer(a));\nhandle(ipc, 'logins:choose', () => answer(b));\nhandle(ipc, 'logins:remove', () => answer(c));\n",
      pushes: false
    },
    {
      name: 'the push in another function, and a change that skips answer',
      text:
        "function elsewhere() {\n  broadcastEvent(EVT_LOGINS_CHANGED);\n}\nasync function answer(c) {\n  return wholeList();\n}\n" +
        "handle(ipc, 'logins:add', () => answer(a));\nhandle(ipc, 'logins:choose', () => wholeList());\nhandle(ipc, 'logins:remove', () => answer(c));\n",
      pushes: false
    }
  ];
  let behaved = 0;
  for (const f of PUSH_FIXTURES) {
    const got = pushesAfterEveryChange(f.text);
    if (got === f.pushes) behaved += 1;
    else failures.push(`${TAG} the push scanner misread the fixture "${f.name}": ${String(got)} (want ${String(f.pushes)})`);
  }
  notes.push(`${String(behaved)} of ${String(PUSH_FIXTURES.length)} push fixtures behaved`);
}

// ---------------------------------------------------------------------------
// Rule 12 (Phase 220, item 1). AN UNCLASSIFIED THROW IN `logins:choose` DOES
// NOT FALL THROUGH TO THE CHOICE.
//
// Measured at `b5cc017`: with `activateLogin` made to reject, the registered
// handler answered `ok: true`, `logins.json` recorded the new name, the person
// was told nothing, and every new session under that login launched with
// whatever bytes happened to be in the store. The catch fell through to
// `chooseLogin` two lines below it.
//
// The rule is read from the HANDLER'S OWN SPAN by matching braces rather than
// by searching the file for a `return`, because a return in some other handler
// is not a return in this one. It is deliberately about the catch and not
// about the words in it: a later round may rewrite the sentence, and it may
// not go on recording a choice it could not make.
// ---------------------------------------------------------------------------

/** The text of the handler registered for `channel`, or null. */
function handlerSpanOf(text, channel) {
  const body = stripComments(text);
  const at = body.indexOf(`'${channel}'`);
  if (at < 0) return null;
  const next = body.indexOf('handle(', at + 1);
  return body.slice(at, next < 0 ? body.length : next);
}

/** Every `catch` block in `span`, as its own text. */
function catchBlocksIn(span) {
  const out = [];
  const re = /\bcatch\b\s*(\([^)]*\))?\s*\{/g;
  let m;
  while ((m = re.exec(span)) !== null) {
    const open = span.indexOf('{', m.index + (m[0].length - 1));
    let depth = 0;
    for (let i = open; i < span.length; i++) {
      const ch = span[i];
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          out.push(span.slice(open, i + 1));
          break;
        }
      }
    }
  }
  return out;
}

/** Does every catch in the choose handler leave rather than fall through? */
function chooseCatchLeaves(text) {
  const span = handlerSpanOf(text, 'logins:choose');
  if (span === null) return false;
  if (!/\bactivateLogin\s*\(/.test(span)) return false;
  const blocks = catchBlocksIn(span);
  if (blocks.length === 0) return false;
  return blocks.every((b) => /\breturn\b/.test(b) || /\bthrow\b/.test(b));
}

check(
  chooseCatchLeaves(ipcText),
  `${TAG} the logins:choose handler has a catch that falls through to the choice, so a step that failed for a reason nobody classified is recorded as a switch that worked`
);
{
  const CHOOSE_FIXTURES = [
    {
      name: 'the catch returns a refusal',
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  try {\n    const put = await activateLogin(d, p, n);\n  } catch {\n    return { ok: false, reason: 'no' };\n  }\n  return answer(chooseLogin(root, p, n));\n});\nhandle(ipc, 'logins:remove', () => 1);\n",
      leaves: true
    },
    {
      name: 'the catch falls through to the choice, which is the parent',
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  try {\n    const put = await activateLogin(d, p, n);\n  } catch {\n    log.info('x');\n  }\n  return answer(chooseLogin(root, p, n));\n});\nhandle(ipc, 'logins:remove', () => 1);\n",
      leaves: false
    },
    {
      name: 'a return in ANOTHER handler does not count',
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  try {\n    await activateLogin(d, p, n);\n  } catch {\n    log.info('x');\n  }\n  return answer(chooseLogin(root, p, n));\n});\nhandle(ipc, 'logins:remove', async () => {\n  try {\n    await forget();\n  } catch {\n    return { ok: false };\n  }\n});\n",
      leaves: false
    },
    {
      name: 'no activation at all is not a passing choose handler',
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  return answer(chooseLogin(root, p, n));\n});\nhandle(ipc, 'logins:remove', () => 1);\n",
      leaves: false
    },
    {
      name: 'a return only in a comment inside the catch',
      text:
        "handle(ipc, 'logins:choose', async (e, p, n) => {\n  try {\n    await activateLogin(d, p, n);\n  } catch {\n    // return { ok: false } would go here\n  }\n  return answer(chooseLogin(root, p, n));\n});\nhandle(ipc, 'logins:remove', () => 1);\n",
      leaves: false
    }
  ];
  let behaved = 0;
  for (const f of CHOOSE_FIXTURES) {
    const got = chooseCatchLeaves(f.text);
    if (got === f.leaves) behaved += 1;
    else
      failures.push(
        `${TAG} the choose-catch scanner misread the fixture "${f.name}": ${String(got)} (want ${String(f.leaves)})`
      );
  }
  notes.push(`${String(behaved)} of ${String(CHOOSE_FIXTURES.length)} choose-catch fixtures behaved`);
}

// ---------------------------------------------------------------------------
// Rule 7. A gate nothing names is how a gate decays.
// ---------------------------------------------------------------------------

const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
check(
  pkg.includes('"conformance:logins"'),
  `${TAG} package.json does not name conformance:logins`
);
const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
check(
  checks.includes('conformance-logins.mjs'),
  `${TAG} build/verification-checks.mjs does not name this gate`
);
const claudeMd = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8');
check(
  claudeMd.includes('conformance:logins'),
  `${TAG} CLAUDE.md does not name conformance:logins, so nobody is told to run it`
);

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${f}\n`);
  process.stderr.write(`${TAG} FAILED with ${String(failures.length)} finding(s)\n`);
  process.exit(1);
}
process.stdout.write(`${TAG} OK: ${notes.join('; ')}.\n`);
