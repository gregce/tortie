#!/usr/bin/env node
/**
 * `npm run conformance:logins`, the cheap gate on the logins domain
 * (Phase 202).
 *
 * About a second. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, makes no request, and reads nothing under the
 * person's home: the only paths it touches are the repository and a scratch
 * directory it makes and removes. Every runtime number it prints came from the
 * SHIPPING modules, run under node by build/logins-conformance-probe.mts.
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
 *   2. ONE DELETION, GUARDED. `rmSync` appears in the domain exactly once, and
 *      the function that holds it asks `isOwnedLoginDir` first, read by
 *      matching braces rather than by searching for the word anywhere in the
 *      file.
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
import { tsxCli } from './ts-runner.mjs';

const TAG = '[logins]';
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOMAIN = join(repoRoot, 'src/main/logins');
/** Phase 203. The account reader, which is in the usage domain on purpose. */
const USAGE = join(repoRoot, 'src/main/usage');
const ACCOUNTS_FILE = join(USAGE, 'login-accounts.ts');

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
check(
  deletionCount === 1,
  `${TAG} the logins domain holds ${String(deletionCount)} deletion calls; it must hold exactly one`
);
notes.push(
  `${String(domainFiles.length)} files scanned, ${String(deletionCount)} deletion call, none names a default location`
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
// The probe, over the tree and over three ablated copies of it.
// ---------------------------------------------------------------------------

function runProbe(loginsDir, accountsDir = null) {
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
        ...(accountsDir === null ? {} : { P203_ACCOUNTS_DIR: accountsDir })
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
    JSON.stringify(d.refusals),
    JSON.stringify(d.chosen),
    JSON.stringify(d.leak),
    JSON.stringify(d.gone),
    JSON.stringify(d.file),
    // Phase 203. The directory is a fresh temporary path on every run, so it
    // is left out of the verdict and only its DERIVED name is compared.
    JSON.stringify({ ...d.presence, scoped: '', dir: '', askedForLogin: d.presence?.askedForLogin?.length ?? 0 }),
    JSON.stringify(d.account)
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
  check(
    live.presence.askedForDefault.includes('Claude Code-credentials'),
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
    live.presence.askedForLogin[0] === wantScoped,
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
    name: 'the keychain half taken out of presence, which is the reported defect',
    dir: 'usage',
    edits: [
      {
        file: 'login-accounts.ts',
        from:
          '    for (const service of claudeServicesFor(d, loginDir)) {\n' +
          '      if (await d.keychainHas(service)) return true;\n' +
          '    }',
        to: ''
      }
    ]
  },
  {
    name: 'a second login allowed to fall through to the plain keychain item',
    dir: 'usage',
    edits: [
      {
        file: 'login-accounts.ts',
        from:
          "  if (loginDir !== null && loginDir !== '') return [claudeScopedService(loginDir)];",
        to:
          "  if (loginDir !== null && loginDir !== '') return [claudeScopedService(loginDir), CLAUDE_KEYCHAIN_SERVICE];"
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
    name: 'the existence test taken out of the resolver, so a gone folder still resolves',
    edits: [
      {
        file: 'store.ts',
        from: "  if (loginDirOnDisk(root, provider, dir) !== 'ok') {",
        to: '  if (!isOwnedLoginDir(root, provider, dir)) {'
      }
    ]
  }
];

const ablationRoot = mkdtempSync(join(tmpdir(), 'p202-ablation-'));
try {
  const liveVerdict = verdict(live);
  let red = 0;
  for (const [i, ablation] of ABLATIONS.entries()) {
    const base = join(ablationRoot, `a${String(i)}`);
    // BOTH DOMAINS ARE COPIED EVERY TIME, so an ablation of either is run
    // against the shipping other one and the reading that moves is the one the
    // clause owns.
    const loginsDir = join(base, 'logins');
    const usageDir = join(base, 'usage');
    mkdirSync(loginsDir, { recursive: true });
    mkdirSync(usageDir, { recursive: true });
    for (const f of ['dirs.ts', 'store.ts', 'paths.ts', 'session.ts', 'index.ts', 'ipc.ts']) {
      cpSync(join(DOMAIN, f), join(loginsDir, f));
    }
    for (const f of ['login-accounts.ts', 'credentials.ts']) {
      cpSync(join(USAGE, f), join(usageDir, f));
    }
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
    const ablated = runProbe(loginsDir, usageDir);
    const changed =
      JSON.stringify(verdict(ablated)) !== JSON.stringify(liveVerdict);
    if (changed) red += 1;
    else {
      failures.push(
        `${TAG} the ablation "${ablation.name}" changed nothing this gate checks, so that rule cannot fail`
      );
    }
  }
  notes.push(`${String(red)} of ${String(ABLATIONS.length)} ablations went red`);
} finally {
  rmSync(ablationRoot, { recursive: true, force: true });
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
