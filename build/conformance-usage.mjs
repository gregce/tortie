#!/usr/bin/env node
/**
 * `npm run conformance:usage`, the gate on where a usage token goes and on what
 * the received row may touch (Phase 374).
 *
 * A few seconds. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, makes no request, opens no keychain and reads
 * nothing under the person's home. The processes it starts are the pinned tsx,
 * once over the tree, once over an unedited copy and once per driven ablation,
 * and `/bin/sh` below it over the generated script in a scratch directory, each
 * started and waited for. Every copy is a dot-named SIBLING of
 * `src/main/usage/`, removed in a `finally`.
 *
 * ## The defect it was written for
 *
 * At the parent `src/main/usage/service.ts` chose a provider's credential
 * reader, request and parser with three `provider === 'claude' ? … : codex`
 * ternaries. Widening `UsageProviderId` by one member left that file with no
 * type error, and the new provider read the person's Codex sign in, sent it to
 * the Codex host and drew Codex's numbers under its own name with Codex's
 * switch off. No gate read where a usage token goes. This one does, and the
 * Codex fall-through is its first ablation.
 *
 * ## The rules
 *
 *   G1  ONE TABLE. `USAGE_PROVIDER_TABLE` is the one object of the domain keyed
 *       by providers, with exactly the members of `UsageProviderId`, read with
 *       the TypeScript parser; the two lookups agree with it, DRIVEN; there is
 *       exactly one receiver; and the COMPILER is asked: a fourth member of the
 *       union, and the third one made a Codex fetch, must each fail to compile
 *       in providers.ts.
 *   G2  NO COMPARISON ON A PROVIDER. No `?:`, `if`, `switch`, `===`, `!==`,
 *       `in` or `includes` on a value whose TYPE is made of provider names, read
 *       with the type checker over the whole domain. `login-accounts.ts`'s three
 *       are on `LoginProviderId` and are named; each must still be there.
 *   G3  OFF MEANS NO READ, per provider, DRIVEN over all eight sets of switches
 *       and both doors: an off provider's keychain, file, login, host and folder
 *       are none of them touched.
 *   G4  A TOKEN GOES TO ITS ISSUER. Each `fetch` entry's host is in the frozen
 *       pair and is the one that belongs to its own reader, DRIVEN by which
 *       planted token its headers carry; and no other host string is in the
 *       domain.
 *   G5  A RECEIVER NAMES NOTHING. Its entry has `kind` and no other field;
 *       nothing under `antigravity/` imports or names a network, a process, a
 *       keychain, a host or a credential path; and the one path under a home is
 *       agy's own settings file, in one file.
 *   G6  NO REFRESH, NO CREDENTIAL WRITE, NO VENDOR PROGRAM anywhere in the
 *       domain: the writes are the received folder's, the processes are the two
 *       keychain READS, and no refresh grant or keychain write verb is spelled.
 *   G7  EVERY SWITCH ON SENDS EXACTLY THE PARENT'S TWO REQUESTS, whole, DRIVEN.
 *   G8  THE SPLICE. `antigravityMeterArgs` has one caller, after the row is
 *       written and after the spawned argv is composed; its answer is spread
 *       straight after the program in one array, or, for a program with nothing
 *       after it, handed to `antigravityShellLine` as that array's ONE element
 *       (a plain create stays on the person's own shell); what comes of it
 *       reaches the spawn and nothing else. Nothing that restores, resumes, restarts or
 *       records names the domain.
 *   G9  THE GENERATED SCRIPT, as text and DRIVEN under `/bin/sh`: none of the
 *       words it may not hold, three programs by absolute path, and over
 *       thirteen payloads exit 0, no output, the kept line and no byte of an
 *       address, a folder or a countdown on disk BUT the planted address as
 *       the `e` of the kept line (Phase 375, which `KEPT` spells). The settings
 *       value holds `statusLine` with three keys.
 *   G10 NO NAME CARRIES AN ACCOUNT. No field of the snapshot or of the IPC map,
 *       and nothing handed to a log call in the domain, holds a hash or an
 *       address; and the payload a window is handed does not hold the mark.
 *       Since Phase 375 exactly TWO NAMED EXCEPTIONS, each of which must still
 *       be there: the optional `email` of `UsageProviderSnapshot`, and the
 *       `usage:account` channel (its key in the IPC map and its bridge member
 *       `account`); and the payload holds no `@` outside the Antigravity row's
 *       `email`.
 *   G11 `LoginProviderId` HAS TWO MEMBERS, and `LOGIN_PROVIDERS` names them.
 *   G12 THE ADDRESS GOES ONLY WHERE IT MAY (Phase 375, build/p375/SPEC.md
 *       §7.2). (a) DRIVEN under `/bin/sh` and `/bin/dash` over the committed
 *       corpus, the script keeps `e` exactly when `usageAddress` accepts the
 *       decoded address and its raw token holds no backslash, and keeps that
 *       address; (b) `UsageProviderSnapshot` names `email` once, optional, and
 *       `viewOf`, `emptyUsageProvider` and the `waiting` row never name it,
 *       and only `antigravityRow` sets it, from `reading.email`; (c) DRIVEN,
 *       every switch on and an address planted, the Claude and Codex rows hold
 *       no `email` key and no `@`, the Antigravity row's `email` is the
 *       planted one, and no other field of it holds it; (d) `usage:account`'s
 *       handler names `current(` and none of `read(`, `refresh(`, `pulse(`,
 *       `usageService(` or the folder; (e) nothing under `src/main/pocket`,
 *       `diagnostics`, `log`, `manifest` or `settings` imports the usage domain
 *       or `@shared/usage`, and no crash annotation in `src/main` names an
 *       account; (f) the command string and the settings value hold no `@`,
 *       and with an address held they are what they were without.
 *
 * EVERY RULE IS SHOWN RED. Each ablation edits one clause, in memory for the
 * rules that read text and in a sibling copy for the ones that are driven, and
 * must make exactly the rules named beside it fail, beside an unedited control.
 *
 * `--live` runs the rules alone, for a caller that brings its own edits
 * (`npm run ablation:p374`); it says so on its last line. `--verbose` prints the
 * sentence each ablation turned red.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { tsxCli } from './ts-runner.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[conformance:usage]';
const t0 = Date.now();
const LIVE_ONLY = process.argv.includes('--live');
const VERBOSE = process.argv.includes('--verbose');

/**
 * Ends the run with `code` once stdout and stderr have handed on every byte
 * written to them (Phase 361.1). The callbacks of an empty write run only
 * after every earlier write to that stream. The promise never settles, so
 * nothing after the caller's await runs, as after process.exit. gate:checks
 * clause 9 pins this function's text byte for byte, so change both together.
 */
function exitWhenWritten(code) {
  process.exitCode = code;
  let open = 2;
  const done = () => {
    open -= 1;
    if (open === 0) process.exit(code);
  };
  process.stdout.write('', done);
  process.stderr.write('', done);
  return new Promise(() => {});
}

// ---------------------------------------------------------------------------
// The files, with edits laid over them in memory
// ---------------------------------------------------------------------------

const DOMAIN = 'src/main/usage';
const SHARED_USAGE = 'src/shared/usage.ts';
const SHARED_LOGINS = 'src/shared/logins.ts';
const SHARED_IPC = 'src/shared/ipc/usage.ts';
const PROVIDERS = `${DOMAIN}/providers.ts`;
const SERVICE = `${DOMAIN}/service.ts`;
const RECEIVE = `${DOMAIN}/antigravity/receive.ts`;
const SCRIPT = `${DOMAIN}/antigravity/script.ts`;
const LAUNCH = `${DOMAIN}/antigravity/launch.ts`;
const FOLDER = `${DOMAIN}/antigravity/folder.ts`;
const OWN = `${DOMAIN}/antigravity/own-status-line.ts`;
const CREATE = 'src/main/sessions/create-local.ts';
const RESTORE = 'src/main/restore/restore.ts';

function filesUnder(dir) {
  const out = [];
  const walk = (at) => {
    for (const entry of readdirSync(join(ROOT, at), { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1
    )) {
      if (entry.name.startsWith('.')) continue;
      const path = `${at}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__') walk(path);
      } else if (/\.tsx?$/.test(entry.name)) out.push(path);
    }
  };
  walk(dir);
  return out;
}

const DOMAIN_FILES = filesUnder(DOMAIN);
const MAIN_FILES = filesUnder('src/main');
const disk = new Map();

function onDisk(path) {
  if (!disk.has(path)) {
    disk.set(path, existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), 'utf8') : null);
  }
  return disk.get(path);
}

/**
 * The files on disk, parsed once for every reading. Since Phase 375 G12 reads
 * every file under `src/main`, so a reading per ablation that parsed them all
 * again tripled the gate's time; a file an ablation does not edit is the same
 * tree whichever reading asks.
 */
const parsedOnDisk = new Map();

/** One reading of the tree: the files on disk, with any edits laid over them. */
function tree(edits = new Map()) {
  const parsed = new Map();
  const read = (path) => (edits.has(path) ? edits.get(path) : onDisk(path));
  return {
    read,
    edits,
    source(path) {
      const cache = edits.has(path) ? parsed : parsedOnDisk;
      if (!cache.has(path)) {
        cache.set(
          path,
          ts.createSourceFile(path, read(path) ?? '', ts.ScriptTarget.ES2023, true)
        );
      }
      return cache.get(path);
    }
  };
}

function each(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => each(child, visit));
}

function lineOf(source, node) {
  return source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
}

const isText = (node) =>
  ts.isStringLiteral(node) ||
  ts.isNoSubstitutionTemplateLiteral(node) ||
  ts.isTemplateHead(node) ||
  ts.isTemplateMiddle(node) ||
  ts.isTemplateTail(node);

/** Is this string a module name, rather than text the program holds? */
function isModuleName(node) {
  const p = node.parent;
  return (
    p !== undefined &&
    (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p))
  );
}

/** The string members of a union type alias, in order, or null when absent. */
function unionMembers(source, name) {
  let found = null;
  each(source, (node) => {
    if (!ts.isTypeAliasDeclaration(node) || node.name.text !== name) return;
    const parts = ts.isUnionTypeNode(node.type) ? node.type.types : [node.type];
    found = parts.map((p) =>
      ts.isLiteralTypeNode(p) && ts.isStringLiteral(p.literal) ? p.literal.text : `?${p.getText(source)}`
    );
  });
  return found;
}

function unwrap(node) {
  let at = node;
  while (
    at !== undefined &&
    (ts.isAsExpression(at) || ts.isSatisfiesExpression(at) || ts.isParenthesizedExpression(at))
  ) {
    at = at.expression;
  }
  return at;
}

/** The initializer of one top level const, unwrapped. */
function constOf(source, name) {
  let found;
  for (const st of source.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === name) found = d.initializer;
    }
  }
  return found;
}

const propName = (p) =>
  p.name === undefined
    ? null
    : ts.isIdentifier(p.name) || ts.isStringLiteralLike(p.name)
      ? p.name.text
      : null;

function keysOf(node) {
  const obj = unwrap(node);
  if (obj === undefined || !ts.isObjectLiteralExpression(obj)) return null;
  return obj.properties.map((p) => propName(p) ?? '?');
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sorted = (a) => [...(a ?? [])].sort();

// ---------------------------------------------------------------------------
// The type checker, over the domain and the shared types alone
// ---------------------------------------------------------------------------

const OPTIONS = {
  target: ts.ScriptTarget.ES2023,
  lib: ['lib.es2023.d.ts'],
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  types: [],
  strict: true,
  noUncheckedIndexedAccess: true,
  noEmit: true,
  skipLibCheck: true,
  isolatedModules: true
};
const libCache = new Map();

/**
 * A program over the tree with its edits. Only `@shared/*` and relative names
 * inside the domain and the shared folder are resolved: what a credential
 * reader imports from elsewhere is `any` here, which no rule below asks about.
 */
function programOf(t, roots) {
  const local = (path) => relative(ROOT, path).split('\\').join('/');
  const text = (path) => {
    const rel = local(path);
    return rel.startsWith('src/') ? t.read(rel) : undefined;
  };
  const base = ts.createCompilerHost(OPTIONS, true);
  const host = {
    ...base,
    getCurrentDirectory: () => ROOT,
    fileExists: (path) => (text(path) ?? null) !== null || base.fileExists(path),
    readFile: (path) => text(path) ?? base.readFile(path),
    getSourceFile(path, languageVersion) {
      const own = text(path);
      if (own !== undefined && own !== null) {
        return ts.createSourceFile(path, own, languageVersion, true);
      }
      if (!libCache.has(path)) libCache.set(path, base.getSourceFile(path, languageVersion));
      return libCache.get(path);
    },
    resolveModuleNameLiterals(literals, containing) {
      return literals.map((literal) => {
        const name = literal.text;
        let stem;
        if (name.startsWith('@shared/')) stem = join(ROOT, 'src/shared', name.slice(8));
        else if (name.startsWith('.')) stem = resolve(dirname(containing), name);
        else return { resolvedModule: undefined };
        for (const path of [`${stem}.ts`, join(stem, 'index.ts')]) {
          const rel = local(path);
          if (!rel.startsWith(DOMAIN) && !rel.startsWith('src/shared/')) continue;
          if ((t.read(rel) ?? null) === null) continue;
          return {
            resolvedModule: {
              resolvedFileName: path,
              extension: ts.Extension.Ts,
              isExternalLibraryImport: false
            }
          };
        }
        return { resolvedModule: undefined };
      });
    }
  };
  return ts.createProgram(
    roots.map((path) => join(ROOT, path)),
    OPTIONS,
    host
  );
}

/** What the compiler says of one file, less the names it was not allowed to resolve. */
function complaintsIn(t, path) {
  const program = programOf(t, [path]);
  const file = program.getSourceFile(join(ROOT, path));
  if (file === undefined) return ['the file is not there'];
  return [...program.getSyntacticDiagnostics(file), ...program.getSemanticDiagnostics(file)]
    .filter((d) => d.code !== 2307)
    .map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' '));
}

/** The string literals a type is made of, or null when it is made of anything else. */
function literalSet(type) {
  const parts = type.isUnion() ? type.types : [type];
  const out = [];
  for (const part of parts) {
    if (!part.isStringLiteral()) return null;
    out.push(part.value);
  }
  return out.length === 0 ? null : out;
}

// ---------------------------------------------------------------------------
// The rules that read text
// ---------------------------------------------------------------------------

const RULES = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8', 'G9', 'G10', 'G11', 'G12'];

/** The frozen pair: whose token may go where. */
const ISSUER = { claude: 'api.anthropic.com', codex: 'chatgpt.com' };
const RECEIVER = 'antigravity';

/** `login-accounts.ts`'s comparisons, all three on a `LoginProviderId`. */
const LOGIN_COMPARISONS = 3;

function replaceOnce(text, from, to, what) {
  const at = text.indexOf(from);
  if (at === -1 || text.indexOf(from, at + 1) !== -1) {
    throw new Error(`the edit "${what}" no longer matches exactly one place: ${from.slice(0, 60)}`);
  }
  return text.slice(0, at) + to + text.slice(at + from.length);
}

function ruleG1(t, probe, say) {
  const shared = t.source(SHARED_USAGE);
  const members = unionMembers(shared, 'UsageProviderId');
  if (members === null) return say('UsageProviderId is not a type alias in src/shared/usage.ts');
  const listed = unwrap(constOf(shared, 'USAGE_PROVIDERS'));
  const order =
    listed !== undefined && ts.isArrayLiteralExpression(listed)
      ? listed.elements.map((e) => (ts.isStringLiteral(e) ? e.text : '?'))
      : null;
  if (!same(order, members)) say(`USAGE_PROVIDERS is ${JSON.stringify(order)} and the union is ${JSON.stringify(members)}`);
  for (const name of ['USAGE_LOGIN_PROVIDER', 'USAGE_RECEIVERS']) {
    const keys = keysOf(constOf(shared, name));
    if (!same(sorted(keys), sorted(members))) say(`${name} is keyed ${JSON.stringify(keys)}, not by every provider`);
  }
  const table = constOf(t.source(PROVIDERS), 'USAGE_PROVIDER_TABLE');
  const keys = keysOf(table);
  if (!same(sorted(keys), sorted(members))) say(`USAGE_PROVIDER_TABLE is keyed ${JSON.stringify(keys)}, not by every provider`);
  if (
    table === undefined ||
    !ts.isSatisfiesExpression(table) ||
    table.type.getText(t.source(PROVIDERS)).replace(/\s+/g, ' ') !==
      '{ readonly [P in UsageProviderId]: EntryOf<P> }'
  ) {
    say('USAGE_PROVIDER_TABLE is not held to `{ readonly [P in UsageProviderId]: EntryOf<P> }` by satisfies');
  }
  // ONE TABLE: no other object of the domain is keyed by a provider's name.
  for (const path of DOMAIN_FILES) {
    const source = t.source(path);
    each(source, (node) => {
      if (!ts.isObjectLiteralExpression(node)) return;
      if (path === PROVIDERS && node === unwrap(table)) return;
      const named = node.properties.map(propName).filter((k) => members.includes(k));
      if (named.length > 0) say(`${path}:${lineOf(source, node)} is a second object keyed by a provider (${named.join(', ')})`);
    });
  }
  // THE COMPILER IS ASKED, over this tree: clean, and red on the two shapes.
  const clean = complaintsIn(t, PROVIDERS);
  if (clean.length > 0) say(`providers.ts does not compile: ${clean[0]}`);
  const usage = t.read(SHARED_USAGE);
  const providers = t.read(PROVIDERS);
  if (/^export type UsageProviderId = [^;]*;/m.test(usage)) {
    const widened = usage.replace(
      /^(export type UsageProviderId = [^;]*);/m,
      (_, head) => `${head} | 'p374-fourth';`
    );
    if (complaintsIn(tree(new Map([...t.edits, [SHARED_USAGE, widened]])), PROVIDERS).length === 0) {
      say('a fourth member of UsageProviderId compiles with no entry of its own');
    }
  } else {
    say('UsageProviderId is not one exported union this rule can widen');
  }
  const receiverEntry = `${RECEIVER}: { kind: 'receiver' }`;
  if (providers.split(receiverEntry).length === 2) {
    const asCodex = providers.replace(receiverEntry, `${RECEIVER}: CODEX_AS_A_STRANGER`).replace(
      'export const USAGE_PROVIDER_TABLE',
      `const CODEX_AS_A_STRANGER: UsageFetchEntry<'codex'> = {
  kind: 'fetch', login: 'codex', host: CODEX_USAGE_HOST, path: CODEX_USAGE_PATH,
  headers: (c) => codexUsageHeaders(c.token, c.accountId ?? ''),
  credential: (d, dir) => readCodexCredential(d, dir),
  parse: (body, _c, now) => parseCodexUsage(body, now)
};
export const USAGE_PROVIDER_TABLE`
    );
    if (complaintsIn(tree(new Map([...t.edits, [PROVIDERS, asCodex]])), PROVIDERS).length === 0) {
      say('the received provider made a Codex fetch compiles');
    }
  } else {
    say(`providers.ts does not hold \`${receiverEntry}\` exactly once`);
  }
  // DRIVEN: what the app runs says the same.
  if (probe.error !== undefined) return say(`the probe could not run: ${probe.error}`);
  if (!same(sorted(Object.keys(probe.table)), sorted(members))) say(`the running table is keyed ${JSON.stringify(Object.keys(probe.table))}`);
  const receivers = Object.keys(probe.table).filter((k) => probe.table[k].kind === 'receiver');
  if (!same(receivers, [RECEIVER])) say(`the receivers are ${JSON.stringify(receivers)}; a second one needs a port of its own in service.ts first`);
  for (const [key, entry] of Object.entries(probe.table)) {
    const lookup = probe.lookups[key];
    if (lookup === undefined) {
      say(`${key} has no lookup`);
      continue;
    }
    if (lookup.receiver !== (entry.kind === 'receiver')) say(`usageIsReceiver('${key}') and the table disagree`);
    if (lookup.login !== entry.login) say(`usageLoginProvider('${key}') is ${lookup.login} and the table says ${entry.login}`);
    if (entry.kind === 'fetch' && entry.login !== key) say(`${key} is read with ${entry.login}'s login`);
  }
}

function ruleG2(t, _probe, say) {
  const members = unionMembers(t.source(SHARED_USAGE), 'UsageProviderId') ?? [];
  const logins = unionMembers(t.source(SHARED_LOGINS), 'LoginProviderId') ?? [];
  const program = programOf(t, DOMAIN_FILES);
  const checker = program.getTypeChecker();
  const made = (node) => {
    const set = literalSet(checker.getTypeAtLocation(node));
    return set !== null && set.every((v) => members.includes(v)) ? set : null;
  };
  const LOOKS = new Set(['includes', 'indexOf', 'lastIndexOf', 'has', 'startsWith', 'endsWith', 'localeCompare', 'match', 'test', 'search']);
  let named = 0;
  for (const path of DOMAIN_FILES) {
    const source = program.getSourceFile(join(ROOT, path));
    if (source === undefined) {
      say(`${path} could not be read`);
      continue;
    }
    each(source, (node) => {
      const where = () => `${path}:${lineOf(source, node)}`;
      if (ts.isBinaryExpression(node)) {
        const op = node.operatorToken.kind;
        const equality = [
          ts.SyntaxKind.EqualsEqualsToken,
          ts.SyntaxKind.EqualsEqualsEqualsToken,
          ts.SyntaxKind.ExclamationEqualsToken,
          ts.SyntaxKind.ExclamationEqualsEqualsToken
        ].includes(op);
        if (equality) {
          const left = made(node.left);
          const right = made(node.right);
          if (left === null && right === null) return;
          const value = ts.isStringLiteralLike(node.left) ? right : left;
          if (path === `${DOMAIN}/login-accounts.ts` && same(sorted(value), sorted(logins)) && !same(sorted(members), sorted(logins))) {
            named += 1;
            return;
          }
          say(`${where()} compares a provider: ${node.getText(source).slice(0, 60)}`);
        } else if (op === ts.SyntaxKind.InKeyword && made(node.left) !== null) {
          say(`${where()} asks whether a provider is in something`);
        }
      } else if (ts.isSwitchStatement(node)) {
        if (made(node.expression) !== null) say(`${where()} switches on a provider`);
      } else if (ts.isCaseClause(node)) {
        if (made(node.expression) !== null) say(`${where()} has a case for a provider`);
      } else if (ts.isConditionalExpression(node)) {
        if (made(node.condition) !== null) say(`${where()} chooses by a provider`);
      } else if (ts.isIfStatement(node)) {
        if (made(node.expression) !== null) say(`${where()} branches on a provider`);
      } else if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        LOOKS.has(node.expression.name.text)
      ) {
        if (made(node.expression.expression) !== null || node.arguments.some((a) => made(a) !== null)) {
          say(`${where()} looks a provider up by its name: ${node.getText(source).slice(0, 60)}`);
        }
      }
    });
  }
  if (named !== LOGIN_COMPARISONS) {
    say(`login-accounts.ts holds ${named} comparisons on LoginProviderId; the named exception is exactly ${LOGIN_COMPARISONS}`);
  }
}

function ruleG3(_t, probe, say) {
  if (probe.error !== undefined) return say(`the probe could not run: ${probe.error}`);
  if (probe.runs.length !== 16) say(`${probe.runs.length} of 16 sets of switches were driven`);
  for (const run of probe.runs) {
    const what = `${JSON.stringify(run.on)} on ${run.arm}`;
    if (!run.on.claude && (run.keychain > 0 || run.hosts.includes(ISSUER.claude) || run.logins.includes('claude'))) {
      say(`${what}: Claude is off and was read`);
    }
    if (!run.on.codex && (run.files.length > 0 || run.hosts.includes(ISSUER.codex) || run.logins.includes('codex'))) {
      say(`${what}: Codex is off and was read`);
    }
    if (!run.on.antigravity && run.receiver.length > 0) {
      say(`${what}: Antigravity is off and its folder was asked to ${run.receiver.join(', ')}`);
    }
    if (run.on.antigravity && !run.receiver.includes('read')) say(`${what}: Antigravity is on and its folder was not read`);
    for (const key of ['claude', 'codex', 'antigravity']) {
      const want = run.on[key] ? 'ok' : 'off';
      if (run.states[key] !== want) say(`${what}: ${key} reads ${run.states[key]}, not ${want}`);
    }
  }
}

function ruleG4(t, probe, say) {
  if (probe.error !== undefined) return say(`the probe could not run: ${probe.error}`);
  const fetches = Object.keys(probe.table).filter((k) => probe.table[k].kind === 'fetch');
  for (const key of fetches) {
    const issued = probe.issued[key];
    const host = probe.table[key].host;
    if (ISSUER[key] === undefined) {
      say(`${key} is asked for and no issuer is frozen for it`);
      continue;
    }
    if (host !== ISSUER[key]) say(`${key} is asked at ${host}, and its issuer is ${ISSUER[key]}`);
    if (!same(issued.carries, [key])) say(`${key}'s own headers carry ${JSON.stringify(issued.carries)}`);
  }
  for (const run of probe.runs) {
    for (const req of run.requests) {
      const owner = Object.keys(ISSUER).find((k) => ISSUER[k] === req.host);
      if (owner === undefined) say(`a request went to ${req.host}`);
    }
  }
  const HOST = /[a-z0-9-]+\.(?:com|net|org|io|ai|dev|app|cloud|google)(?![a-z])|https?:\/\//i;
  for (const path of DOMAIN_FILES) {
    const source = t.source(path);
    each(source, (node) => {
      if (!isText(node) || isModuleName(node)) return;
      const text = node.text;
      if (!HOST.test(text)) return;
      if (path === `${DOMAIN}/endpoints.ts` && Object.values(ISSUER).includes(text)) return;
      // The Claude tap's own loopback route, which names no host but this Mac.
      if (path === `${DOMAIN}/statusline.ts` && /http:\/\/127\\{0,2}\.0\\{0,2}\.0\\{0,2}\.1:/.test(text) && !/https?:\/\/(?!127)/.test(text)) return;
      say(`${path}:${lineOf(source, node)} names a host: ${text.slice(0, 50)}`);
    });
  }
}

const RECEIVER_IMPORTS = new Set([
  'node:path',
  'node:crypto',
  'electron',
  '@shared/usage',
  '@shared/specstory-status',
  '../../agents/detection',
  '../../log',
  '../../settings/store',
  '../statusline',
  './folder',
  './own-status-line',
  './script',
  './receive'
]);
const RECEIVER_FS = new Set([FOLDER, OWN]);
const RECEIVER_NAMES =
  /^(?:fetch|https?|net|tls|dgram|request|connect|createConnection|spawn\w*|exec\w*|fork|utilityProcess|keychain\w*|runGuarded|homedir|userInfo|WebSocket|XMLHttpRequest)$/;
const RECEIVER_WORDS =
  /child_process|keychain|\bsecurity\b|https?:|\.claude|\.codex|auth\.json|oauth_creds|credentials|\.ssh|Library\/|find-generic/i;

function ruleG5(t, probe, say) {
  const inside = DOMAIN_FILES.filter((path) => path.startsWith(`${DOMAIN}/antigravity/`));
  const table = unwrap(constOf(t.source(PROVIDERS), 'USAGE_PROVIDER_TABLE'));
  if (table !== undefined && ts.isObjectLiteralExpression(table)) {
    for (const p of table.properties) {
      if (propName(p) !== RECEIVER || !ts.isPropertyAssignment(p)) continue;
      const keys = keysOf(p.initializer);
      if (!same(keys, ['kind'])) say(`the receiver's entry has ${JSON.stringify(keys)}; it has its kind and nothing else`);
    }
  }
  if (probe.error === undefined && !same(probe.table[RECEIVER]?.keys, ['kind'])) {
    say(`the running receiver's entry has ${JSON.stringify(probe.table[RECEIVER]?.keys)}`);
  }
  let underHome = 0;
  for (const path of inside) {
    const source = t.source(path);
    each(source, (node) => {
      const where = `${path}:${lineOf(source, node)}`;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const from = node.moduleSpecifier;
        if (from === undefined || !ts.isStringLiteral(from)) return;
        if (from.text === 'node:fs' && RECEIVER_FS.has(path)) return;
        if (!RECEIVER_IMPORTS.has(from.text)) return say(`${where} imports ${from.text}`);
        if (from.text === 'electron') {
          const names = node.importClause?.namedBindings;
          if (names === undefined || !ts.isNamedImports(names) || !same(names.elements.map((e) => e.name.text), ['app'])) {
            say(`${where} takes more than \`app\` from electron`);
          }
        }
        return;
      }
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(source) === 'require')) {
        return say(`${where} loads a module while it runs`);
      }
      if (ts.isIdentifier(node) && RECEIVER_NAMES.test(node.text)) say(`${where} names ${node.text}`);
      if (isText(node) && !isModuleName(node)) {
        if (RECEIVER_WORDS.test(node.text)) say(`${where} holds "${node.text.trim().slice(0, 40)}"`);
        if (/\.gemini|settings\.json/.test(node.text)) {
          if (path === OWN) underHome += 1;
          else say(`${where} names a path under a home`);
        }
      }
    });
  }
  // The one path, spelled as its three parts in one file.
  if (underHome !== 2) say(`own-status-line.ts names agy's settings file ${underHome} times; it is spelled once, as .gemini and settings.json`);
  for (const path of inside) {
    if (path === OWN) continue;
    if (/\.gemini/.test(stripped(t.source(path)))) say(`${path} names agy's own folder`);
  }
}

/** A file's text with every comment blanked. */
function stripped(source) {
  const printer = ts.createPrinter({ removeComments: true });
  return printer.printFile(source);
}

const FS_WRITES =
  /^(?:writeFile|appendFile|rename|unlink|rm|rmdir|mkdir|mkdtemp|chmod|chown|copyFile|cp|symlink|link|truncate|ftruncate|write|writev|createWriteStream|utimes|lutimes|open)(?:Sync)?$/;

function ruleG6(t, _probe, say) {
  const program = /^(?:execFile|execFileSync|exec|execSync|spawn|spawnSync|fork|runGuarded)$/;
  for (const path of DOMAIN_FILES) {
    const source = t.source(path);
    each(source, (node) => {
      const where = `${path}:${lineOf(source, node)}`;
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const from = node.moduleSpecifier.text;
        const names = node.importClause?.namedBindings;
        const taken = names !== undefined && ts.isNamedImports(names) ? names.elements.map((e) => (e.propertyName ?? e.name).text) : ['*'];
        if (/^(?:node:)?fs(?:\/promises)?$/.test(from) && path !== FOLDER) {
          for (const name of taken) {
            if (name === '*' || (FS_WRITES.test(name) && !(path === OWN && name === 'openSync'))) {
              say(`${where} can write a file (${name})`);
            }
          }
        }
        if (/child_process$/.test(from) && !(path === `${DOMAIN}/login-accounts.ts` && same(taken, ['execFile']))) {
          say(`${where} can start a process (${taken.join(', ')})`);
        }
        if (/proc\/guarded$/.test(from) && !(path === `${DOMAIN}/credentials.ts` && same(taken, ['runGuarded']))) {
          say(`${where} can start a process (${taken.join(', ')})`);
        }
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && program.test(node.expression.text)) {
        const [bin, argv] = node.arguments;
        const binText = bin?.getText(source) ?? '';
        const okBin = binText === 'bin' || binText === "'/usr/bin/security'" || binText === 'KEYCHAIN_BIN';
        const verb = argv !== undefined && ts.isArrayLiteralExpression(argv) ? argv.elements[0]?.getText(source) : '';
        if (!okBin || verb !== "'find-generic-password'") say(`${where} starts ${binText} ${verb}`);
      }
      if (isText(node) && !isModuleName(node)) {
        if (/refresh_token|grant_type|oauth\/token|refreshToken/.test(node.text)) say(`${where} names a token refresh`);
        if (/(?:add|delete|set)-generic-password|set-keychain|import-key/.test(node.text)) say(`${where} names a keychain write`);
      }
    });
  }
}

const PARENT_REQUESTS = [
  {
    host: 'api.anthropic.com',
    path: '/api/oauth/usage',
    headers: {
      authorization: 'Bearer P374-CLAUDE-TOKEN',
      'anthropic-beta': 'oauth-2025-04-20',
      'user-agent': 'claude-code/2.1.0',
      accept: 'application/json'
    }
  },
  {
    host: 'chatgpt.com',
    path: '/backend-api/wham/usage',
    headers: {
      authorization: 'Bearer P374-CODEX-TOKEN',
      'user-agent': 'codex-cli',
      'openai-beta': 'codex-1',
      originator: 'Codex Desktop',
      'chatgpt-account-id': 'P374-CODEX-ACCOUNT',
      accept: 'application/json'
    }
  }
];

function ruleG7(_t, probe, say) {
  if (probe.error !== undefined) return say(`the probe could not run: ${probe.error}`);
  for (const run of probe.runs) {
    const want = PARENT_REQUESTS.filter((_, i) => [run.on.claude, run.on.codex][i]);
    if (!same(run.requests, want)) {
      say(`${JSON.stringify(run.on)} on ${run.arm} sent ${JSON.stringify(run.requests.map((r) => r.host))}; the parent sends ${JSON.stringify(want.map((r) => r.host))}, whole`);
    }
  }
}

/** What must not name the splice, because it records, restores or types a line. */
const NEVER_SPLICED = [
  'src/main/restore/',
  'src/main/restart/',
  'src/main/manifest/',
  'src/main/machines/',
  'src/main/sessions/resume-in-place.ts',
  'src/main/sessions/resume-argv.ts',
  'src/main/sessions/inline-repair.ts',
  'src/main/sessions/codex-repair.ts',
  'src/main/sessions/id-harvest.ts',
  'src/main/sessions/launch-plan.ts',
  'src/main/sessions/pocket-start.ts',
  'src/main/agents/'
];

function ruleG8(t, _probe, say) {
  const calls = [];
  for (const path of MAIN_FILES) {
    const text = t.read(path) ?? '';
    const code = /antigravity/i.test(text) ? stripped(t.source(path)) : '';
    if (NEVER_SPLICED.some((p) => path.startsWith(p))) {
      if (/usage\/antigravity|antigravityMeterArgs|antigravitySettingsJson|antigravityStatusCommand/.test(code)) {
        say(`${path} names the splice, and it records, restores or types a line`);
      }
    }
    if (path === LAUNCH) continue;
    if (!/antigravityMeterArgs/.test(code)) continue;
    const source = t.source(path);
    each(source, (node) => {
      if (ts.isIdentifier(node) && node.text === 'antigravityMeterArgs') {
        if (ts.isCallExpression(node.parent) && node.parent.expression === node) calls.push({ path, source, node: node.parent });
        else if (!ts.isImportSpecifier(node.parent)) say(`${path}:${lineOf(source, node)} hands antigravityMeterArgs on`);
      }
    });
  }
  if (calls.length !== 1 || calls[0].path !== CREATE) {
    return say(`antigravityMeterArgs is called at ${calls.map((c) => c.path).join(', ') || 'no place'}; its one caller is ${CREATE}`);
  }
  const source = t.source(CREATE);
  const callPos = calls[0].node.getStart(source);
  let inserted = -1;
  let composed = -1;
  let args = null;
  let holder = null;
  let spawned = null;
  each(source, (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression.getText(source);
      if (callee === 'deps.manifest.insertSession') inserted = node.getStart(source);
      if (callee === 'spawnArgvFor') composed = node.getStart(source);
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      if (node.initializer !== undefined && node.initializer.pos <= callPos && node.initializer.end >= callPos) args = node.name.text;
    }
  });
  if (inserted === -1 || inserted > callPos) say('the splice is decided before the row is written');
  if (composed === -1 || composed > callPos) say('the splice is decided before the spawned argv is composed');
  if (args === null) return say('the splice is not held in one const');
  each(source, (node) => {
    if (!ts.isArrayLiteralExpression(node)) return;
    const at = node.elements.findIndex((e) => ts.isSpreadElement(e) && e.expression.getText(source) === args);
    if (at === -1) return;
    if (holder !== null) say('the splice is spread in two arrays');
    holder = node;
    if (at !== 1 || ts.isSpreadElement(node.elements[0])) say('the splice is not straight after the program');
  });
  if (holder === null) return say('the splice is spread in no array');
  // A plain create keeps the ONE element tmux hands to the person's shell.
  const lines = [];
  each(source, (node) => {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'antigravityShellLine') lines.push(node);
  });
  const line = lines[0];
  if (
    lines.length !== 1 ||
    !same(line.arguments.map((a) => a.getText(source)), ['program', args]) ||
    !ts.isArrayLiteralExpression(line.parent) ||
    line.parent.elements.length !== 1 ||
    !ts.isConditionalExpression(line.parent.parent) ||
    line.parent.parent.whenTrue !== line.parent ||
    line.parent.parent.whenFalse !== holder ||
    line.parent.parent.condition.getText(source) !== 'programArgs.length === 0'
  ) {
    say('a program with nothing after it does not stay one element for the person’s shell');
  }
  let up = holder.parent;
  while (up !== undefined && !ts.isVariableDeclaration(up)) up = up.parent;
  spawned = up !== undefined && ts.isIdentifier(up.name) ? up.name.text : null;
  if (spawned === null) return say('the spawned argv is not held in one const');
  const uses = [];
  each(source, (node) => {
    if (!ts.isIdentifier(node) || node.text !== spawned) return;
    const p = node.parent;
    if (ts.isVariableDeclaration(p) && p.name === node) return;
    uses.push(p);
  });
  if (uses.length !== 1 || !ts.isPropertyAssignment(uses[0]) || propName(uses[0]) !== 'argv') {
    say(`the spliced argv is used in ${uses.length} places; it reaches the spawn and nothing else`);
  } else {
    let callee = uses[0].parent;
    while (callee !== undefined && !ts.isCallExpression(callee)) callee = callee.parent;
    if (callee?.expression.getText(source) !== 'tmux.createSession') say('the spliced argv does not go to the spawn');
  }
  each(source, (node) => {
    if (!ts.isIdentifier(node) || node.text !== args) return;
    const p = node.parent;
    if (ts.isVariableDeclaration(p) && p.name === node) return;
    if (ts.isPropertyAccessExpression(p) && p.name.text === 'length') return;
    if (ts.isSpreadElement(p) && p.parent === holder) return;
    if (ts.isCallExpression(p) && p === line && p.arguments[1] === node) return;
    say(`${CREATE}:${lineOf(source, node)} uses the splice somewhere else`);
  });
}

/** The one line the script writes. `e` is the D2 class since Phase 375, or null. */
const KEPT = /^\{"v":1,"h":"[0-9a-f]{64}","e":(?:null|"[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+"),"p":(?:null|"[A-Za-z][A-Za-z0-9 _-]*"),"q":\{(?:"(?:gemini-5h|gemini-weekly|3p-5h|3p-weekly)":\{"f":(?:null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][-+]?[0-9]+)?),"r":(?:null|"[0-9TZ:.+-]+"),"d":(?:null|true|false),"a":(?:true|false)\},?)+\}\}$/;

function ruleG9(_t, probe, say) {
  if (probe.error !== undefined) return say(`the probe could not run: ${probe.error}`);
  const { text, command, salt } = probe.script;
  if (salt === null) say('the generated script carries no salt its own reader finds');
  if (probe.scriptParses !== 0) say('/bin/sh cannot parse the generated script');
  const code = text
    .split('\n')
    .filter((line) => !line.startsWith('#'))
    .join('\n');
  const open = code.indexOf("/usr/bin/awk '");
  const close = open === -1 ? -1 : code.indexOf("'", open + 14);
  if (open === -1 || close === -1) return say('the reader is not one awk program between two apostrophes');
  const shell = code.slice(0, open + 13) + code.slice(close + 1);
  for (const [what, pattern] of [
    ['a here-document', /<</],
    ['a backtick', /`/],
    ['eval', /\beval\b/],
    ['a background child', /(?<![&>])&(?![&>]|\d)/],
    ['sleep', /\bsleep\b/],
    ['date', /\bdate\b/],
    ['a network program', /\b(?:curl|wget|nc|ssh|openssl s_client)\b/],
    ['an interpreter', /\b(?:python3?|node|perl|ruby|osascript|jq|plutil)\b/],
    ['the home', /\$\{?HOME|~\//],
    ['a change of folder', /(?:^|\n|;\s*|&& )cd /],
    ['a working directory', /\$\{?PWD/],
    ['a command on the PATH', /(?:^|\n|\| ?|\$\()(?:awk|openssl|mv|rm|cat|sed|grep)\b/]
  ]) {
    if (pattern.test(shell)) say(`the generated script holds ${what}`);
  }
  if (/\bsystem\(|\|\s*getline|\bgetline\b|>\s*"|\bENVIRON\b|\bclose\(/.test(code.slice(open, close))) {
    say('the awk reader reads or writes something of its own');
  }
  const programs = [...new Set(shell.match(/\/(?:usr\/)?s?bin\/[a-z0-9]+/g) ?? [])].sort();
  if (!same(programs, ['/bin/mv', '/bin/rm', '/usr/bin/awk', '/usr/bin/openssl'])) say(`the generated script runs ${programs.join(', ')}`);
  if (!/(?:^|\n)umask 077\n/.test(shell)) say('the generated script does not set its umask');
  if (!/(?:^|\n)unset /.test(shell)) say('the generated script does not unset its own names first');
  if (!command.startsWith("trap 'exit 0' 0; ") || !command.endsWith('; exit 0') || !/^trap 'exit 0' 0; exec >\/dev\/null 2>&1; \[ -r '/.test(command)) {
    say('the command string does not answer 0, with both outputs closed for the whole run, whatever the script does');
  }
  const line = probe.settings?.statusLine;
  if (
    !same(Object.keys(probe.settings ?? {}), ['statusLine']) ||
    !same(sorted(Object.keys(line ?? {})), ['command', 'stack_with_default', 'type']) ||
    line.type !== 'command' ||
    line.stack_with_default !== true ||
    line.command !== command
  ) {
    say(`the settings value is not statusLine with its three keys: ${JSON.stringify(Object.keys(line ?? {}))}`);
  }
  const want = {
    'the ordinary payload': (k) => /"f":0\.75,"r":"2031-01-10T15:00:00Z"/.test(k) && /"gemini-weekly":\{"f":0\.5,/.test(k),
    'an address as the reset': (k) => /"f":0\.5,"r":null/.test(k),
    'an address as the plan': (k) => /"p":null/.test(k),
    'an address as the fraction': (k) => /"f":null/.test(k),
    'an address as a bucket id': (k) => /"f":0\.75/.test(k),
    'a fraction that is not a JSON number': (k) => /"f":null/.test(k),
    'an amount': (k) => /"a":true/.test(k),
    disabled: (k) => /"d":true/.test(k),
    'no address': (k) => k === '{}',
    'an address that is an object': (k) => k === '{}',
    'a truncated payload': (k) => k === '{}',
    'trailing junk': (k) => k === '{}',
    nothing: (k) => k === '{}'
  };
  if (!same(probe.scriptRuns.map((r) => r.what), Object.keys(want))) say('the thirteen payloads are not the ones this rule judges');
  for (const run of probe.scriptRuns) {
    if (run.status !== 0) say(`${run.what}: the run answered ${run.status}`);
    if (run.output !== '') say(`${run.what}: the run said ${JSON.stringify(run.output.slice(0, 60))}`);
    if (run.leaks.length > 0) say(`${run.what}: ${run.leaks.join(', ')} reached the disk`);
    if (run.names.length !== 1) say(`${run.what}: ${run.names.length} files were left`);
    if (!want[run.what]?.(run.kept)) say(`${run.what}: kept ${run.kept.slice(0, 160)}`);
    if (run.kept !== '{}' && !KEPT.test(run.kept)) say(`${run.what}: the kept line is not the one shape`);
    // Phase 375: every one of these payloads names the same plain address, so a
    // line that was written keeps exactly it, and nothing else, as `e`.
    if (run.kept !== '{}' && run.e !== probe.scriptAddress) say(`${run.what}: kept ${JSON.stringify(run.e)} as the address`);
  }
  if (probe.missingScript.status !== 0 || probe.missingScript.output !== '') {
    say(`with no script the command answered ${probe.missingScript.status} and said ${JSON.stringify(probe.missingScript.output)}`);
  }
}

const ACCOUNT_WORD = /hash|e-?mail|address|salt|account|subject|token|cwd|transcript|title/i;

/**
 * The two names Phase 375 allows, by where each stands, and why. Each must
 * still be found, so the list cannot rot into a hole.
 */
const ACCOUNT_EXCEPTIONS = [
  { path: SHARED_USAGE, in: 'UsageProviderSnapshot', name: 'email', why: 'the received row’s address (SPEC D6)' },
  { path: SHARED_IPC, in: 'UsageInvokeChannelMap', name: 'usage:account', why: 'the read Settings asks (SPEC D10)' },
  { path: SHARED_IPC, in: 'GmuxUsageExtras', name: 'account', why: 'that read’s bridge member (SPEC D10)' }
];

function ruleG10(t, probe, say) {
  const met = new Set();
  const names = (path, wanted) => {
    const source = t.source(path);
    each(source, (node) => {
      if (!ts.isInterfaceDeclaration(node) || !wanted(node.name.text)) return;
      each(node, (inner) => {
        if ((ts.isPropertySignature(inner) || ts.isMethodSignature(inner)) && inner.name !== undefined) {
          const name = inner.name.getText(source).replace(/['"]/g, '');
          if (!ACCOUNT_WORD.test(name)) return;
          const allowed = ACCOUNT_EXCEPTIONS.find((x) => x.path === path && x.in === node.name.text && x.name === name);
          if (allowed !== undefined && !met.has(allowed)) {
            met.add(allowed);
            return;
          }
          say(`${path}: ${node.name.text} has a field named ${name}`);
        }
      });
    });
  };
  names(SHARED_USAGE, (n) => /^Usage(?!Login)/.test(n));
  names(SHARED_IPC, () => true);
  for (const x of ACCOUNT_EXCEPTIONS) {
    if (!met.has(x)) say(`the named exception ${x.in}.${x.name} (${x.why}) is no longer there`);
  }
  for (const path of DOMAIN_FILES) {
    const source = t.source(path);
    each(source, (node) => {
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression.getText(source);
      if (!/(?:^|\.)log(?:\.(?:error|warn|info|debug))?$/.test(callee) && !/^console\./.test(callee)) return;
      for (const arg of node.arguments) {
        each(arg, (inner) => {
          if (ts.isIdentifier(inner) && (ACCOUNT_WORD.test(inner.text) || /^(?:body|text|reading|received|bucket|buckets|plan|snapshot|parsed|payload|credential|cred)$/.test(inner.text))) {
            say(`${path}:${lineOf(source, node)} hands ${inner.text} to a log line`);
          }
        });
      }
    });
  }
  if (probe.error !== undefined) return say(`the probe could not run: ${probe.error}`);
  // A payload of no rows holds no account either. G3 holds that each row of it was drawn.
  for (const key of [...Object.keys(ISSUER), RECEIVER]) {
    if (typeof probe.payload !== 'string' || !probe.payload.includes(`"provider":"${key}"`)) say(`the payload a window is handed has no ${key} row, so nothing was looked for in it`);
  }
  if (probe.payloadHoldsMark !== false) say('the payload a window is handed holds the account mark');
  if (/[0-9a-f]{40}/.test(probe.payload)) say('the payload a window is handed holds a long hex value');
  // Phase 375: one address may stand in it, as the Antigravity row's `email`.
  let rest = probe.payload;
  try {
    const parsed = JSON.parse(probe.payload);
    for (const row of parsed.providers ?? []) if (row?.provider === RECEIVER) delete row.email;
    rest = JSON.stringify(parsed);
  } catch {
    say('the payload a window is handed is not JSON');
  }
  if (/@|example\.(?:com|invalid)/.test(rest)) say('the payload a window is handed holds an address outside the Antigravity row’s email');
  for (const run of probe.runs) {
    if (/@|[0-9a-f]{40}/.test(JSON.stringify(run.logs))) say('a log line holds an address or a mark');
  }
}

function ruleG11(t, _probe, say) {
  const source = t.source(SHARED_LOGINS);
  const members = unionMembers(source, 'LoginProviderId');
  if (!same(members, ['claude', 'codex'])) say(`LoginProviderId is ${JSON.stringify(members)}; it stays two`);
  const listed = unwrap(constOf(source, 'LOGIN_PROVIDERS'));
  const order =
    listed !== undefined && ts.isArrayLiteralExpression(listed)
      ? listed.elements.map((e) => (ts.isStringLiteral(e) ? e.text : '?'))
      : null;
  if (!same(order, ['claude', 'codex'])) say(`LOGIN_PROVIDERS is ${JSON.stringify(order)}`);
}

/** The folders an address may never reach, by any import (SPEC D11). */
const NO_ADDRESS_FOLDERS = ['src/main/pocket', 'src/main/diagnostics', 'src/main/log', 'src/main/manifest', 'src/main/settings'];
const IPC_FILE = `${DOMAIN}/ipc.ts`;

/** Every module name a file imports, re-exports, `import()`s or `require`s. */
function moduleNamesOf(source) {
  const out = [];
  each(source, (node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier !== undefined && ts.isStringLiteral(node.moduleSpecifier)) {
      out.push(node.moduleSpecifier.text);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && ts.isStringLiteral(node.moduleReference.expression)) {
      out.push(node.moduleReference.expression.text);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments[0] !== undefined &&
      isText(node.arguments[0])
    ) {
      out.push(node.arguments[0].text);
    }
  });
  return out;
}

/** Is this module name, written in `from`, the usage domain or the shared usage file? */
function namesUsage(from, name) {
  if (/^@shared\/usage(?:\.ts)?$/.test(name)) return true;
  if (!name.startsWith('.')) return false;
  const to = relative(ROOT, resolve(ROOT, dirname(from), name));
  return to === DOMAIN || to.startsWith(`${DOMAIN}/`) || /^src\/shared\/usage(?:\.ts)?$/.test(to);
}

/** Every identifier and property name under a node, as text. */
function namesUnder(source, node) {
  const out = [];
  each(node, (inner) => {
    if (ts.isIdentifier(inner) || ts.isPrivateIdentifier(inner)) out.push(inner.text);
    else if (ts.isStringLiteral(inner) && ts.isPropertyAssignment(inner.parent) && inner.parent.name === inner) out.push(inner.text);
  });
  return out;
}

/** The function declaration, or the const bound to an arrow or function, called `name`, anywhere in a file. */
function functionNamed(source, name) {
  let found;
  each(source, (node) => {
    if (found !== undefined) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node;
    else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name && node.initializer !== undefined) {
      const init = unwrap(node.initializer);
      if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) found = init;
    }
  });
  return found;
}

function ruleG12(t, probe, say) {
  // (b) the field, read with the parser.
  const shared = t.source(SHARED_USAGE);
  let fields = 0;
  each(shared, (node) => {
    if (!ts.isInterfaceDeclaration(node) || node.name.text !== 'UsageProviderSnapshot') return;
    for (const m of node.members) {
      if (propName(m) !== 'email') continue;
      fields += 1;
      if (m.questionToken === undefined) say('UsageProviderSnapshot.email is not optional');
      if (m.type?.getText(shared) !== 'string') say(`UsageProviderSnapshot.email is ${m.type?.getText(shared)}, not string`);
    }
  });
  if (fields !== 1) say(`UsageProviderSnapshot names email ${fields} times; it names it once`);
  const empty = functionNamed(shared, 'emptyUsageProvider');
  if (empty === undefined) say('emptyUsageProvider is not there to read');
  else if (namesUnder(shared, empty).includes('email')) say('emptyUsageProvider names email');
  const service = t.source(SERVICE);
  const view = functionNamed(service, 'viewOf');
  if (view === undefined) say('viewOf is not there to read');
  else if (namesUnder(service, view).includes('email')) say('viewOf names email, so an asked row could carry one');
  const receive = t.source(RECEIVE);
  const row = functionNamed(receive, 'antigravityRow');
  if (row === undefined) say('antigravityRow is not there to read');
  else {
    const waiting = functionNamed(row, 'waiting');
    if (waiting === undefined) say('the waiting row is not there to read');
    else if (namesUnder(receive, waiting).includes('email')) say('the waiting row names email');
  }
  // Only antigravityRow sets it on a row, and from the reading's own field.
  let setters = 0;
  for (const path of [...DOMAIN_FILES, SHARED_USAGE]) {
    const source = t.source(path);
    each(source, (node) => {
      if (!(ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) || propName(node) !== 'email') return;
      // Phase 203's account reader answers the logins store, never a usage row.
      if (path === `${DOMAIN}/login-accounts.ts`) return;
      let inRow = false;
      for (let at = node.parent; at !== undefined; at = at.parent) if (at === row) inRow = true;
      // The reading's own field, asked the shape in parseAntigravityFile.
      const parse = functionNamed(receive, 'parseAntigravityFile');
      let inParse = false;
      for (let at = node.parent; at !== undefined; at = at.parent) if (at === parse) inParse = true;
      const value = ts.isPropertyAssignment(node) ? node.initializer.getText(source) : 'email';
      if (path === RECEIVE && inRow && value === 'reading.email') {
        setters += 1;
        return;
      }
      if (path === RECEIVE && inParse && value === "usageAddress(obj['e'])") return;
      say(`${path}:${lineOf(source, node)} sets email to ${value}`);
    });
  }
  if (setters !== 1) say(`antigravityRow sets email from reading.email ${setters} times; it does once`);

  // (d) the read Settings asks builds nothing and reads nothing.
  const ipc = t.source(IPC_FILE);
  let handler;
  each(ipc, (node) => {
    if (ts.isCallExpression(node) && node.expression.getText(ipc) === 'handle' && node.arguments[1] !== undefined && ts.isStringLiteral(node.arguments[1]) && node.arguments[1].text === 'usage:account') {
      handler = node.arguments[2];
    }
  });
  if (handler === undefined) say('usage:account has no handler to read');
  else {
    const folder = new Set();
    for (const st of ipc.statements) {
      if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && /antigravity\/(?:folder|launch)$/.test(st.moduleSpecifier.text)) {
        for (const el of st.importClause?.namedBindings?.elements ?? []) folder.add(el.name.text);
      }
    }
    const calls = [];
    each(handler, (node) => {
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression;
      calls.push(ts.isPropertyAccessExpression(callee) ? callee.name.text : callee.getText(ipc));
    });
    if (!calls.includes('current')) say('usage:account does not answer from current()');
    for (const bad of ['read', 'refresh', 'pulse', 'usageService', 'armUsagePulse', 'receive', ...folder]) {
      if (calls.includes(bad)) say(`usage:account calls ${bad}()`);
    }
  }

  // (e) no folder an address may not reach imports the usage domain, and no
  // crash annotation names an account.
  for (const path of MAIN_FILES) {
    const source = t.source(path);
    if (NO_ADDRESS_FOLDERS.some((d) => path.startsWith(`${d}/`))) {
      for (const name of moduleNamesOf(source)) {
        if (namesUsage(path, name)) say(`${path} imports ${name}, so the address could reach it`);
      }
    }
    each(source, (node) => {
      if (!ts.isCallExpression(node)) return;
      const callee = node.expression;
      const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : callee.getText(source);
      if (name !== 'addExtraParameter') return;
      const said = node.arguments.map((a) => a.getText(source)).join(' ');
      if (/e-?mail|address|account|usage|received|reading/i.test(said)) say(`${path}:${lineOf(source, node)} names an account in a crash annotation`);
    });
  }

  if (probe.error !== undefined) return say(`the probe could not run: ${probe.error}`);
  // (a) the corpus, driven.
  if (!Array.isArray(probe.corpus) || probe.corpus.length < 40) say('the address corpus was not run');
  for (const c of probe.corpus ?? []) {
    for (const [sh, k] of Object.entries(c.kept ?? {})) {
      if (k.status !== 0 || k.output !== '' || k.files !== 2) say(`${c.name} [${sh}]: answered ${k.status}, said ${JSON.stringify(k.output)}, left ${k.files} files`);
      if (k.e === 'odd') say(`${c.name} [${sh}]: the line is not the one shape`);
      if (c.want === 'none') {
        if (k.e !== 'none') say(`${c.name} [${sh}]: wrote where the case writes nothing`);
        continue;
      }
      const keeps = c.accepted !== null && c.backslash === false;
      const want = keeps ? c.decoded : null;
      if (k.e !== want) say(`${c.name} [${sh}]: kept ${JSON.stringify(k.e)}, where the shared shape says ${JSON.stringify(want)}`);
      if (k.e !== c.want) say(`${c.name} [${sh}]: kept ${JSON.stringify(k.e)}, the corpus says ${JSON.stringify(c.want)}`);
    }
  }
  // (c) the payload, driven.
  let parsed = null;
  try {
    parsed = JSON.parse(probe.payload);
  } catch {
    say('the payload a window is handed is not JSON');
  }
  for (const r of parsed?.providers ?? []) {
    if (r.provider === RECEIVER) {
      if (r.email !== probe.planted) say(`the Antigravity row's email is ${JSON.stringify(r.email)}, not the planted address`);
      const { email: _held, ...rest } = r;
      if (JSON.stringify(rest).includes(probe.planted)) say('another field of the Antigravity row holds the address');
    } else {
      if (Object.prototype.hasOwnProperty.call(r, 'email')) say(`the ${r.provider} row has an email key`);
      if (JSON.stringify(r).includes('@')) say(`the ${r.provider} row holds an @`);
    }
  }
  // (f) what agy is handed holds no address, and an address held moves nothing.
  const a = probe.argv ?? {};
  if (a.held !== true) say('the argv was not composed beside a service that holds an address');
  if (/@/.test(`${a.settingsBefore}${a.commandBefore}`)) say('the command or the settings value holds an @');
  if (a.settingsBefore !== a.settingsAfter || a.commandBefore !== a.commandAfter) say('the argv moved once an address was held');
}

const JUDGES = {
  G1: ruleG1,
  G2: ruleG2,
  G3: ruleG3,
  G4: ruleG4,
  G5: ruleG5,
  G6: ruleG6,
  G7: ruleG7,
  G8: ruleG8,
  G9: ruleG9,
  G10: ruleG10,
  G11: ruleG11,
  G12: ruleG12
};

/** Judge every rule over one tree and one probe's reading. */
function judge(t, probe) {
  const red = new Map();
  for (const rule of RULES) {
    const said = [];
    try {
      JUDGES[rule](t, probe, (text) => said.push(text));
    } catch (err) {
      said.push(`the rule could not be read: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (said.length > 0) red.set(rule, said);
  }
  return red;
}

// ---------------------------------------------------------------------------
// The probe, over the tree or over a sibling copy
// ---------------------------------------------------------------------------

/**
 * `corpus` false leaves out Phase 375's address corpus (84 runs of the script),
 * for a copy whose edit does not reach the script's reader: the reading of the
 * tree stands in for it, and the gate stays near its Phase 374 time.
 */
function runProbe(dir, corpus = true) {
  const run = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/usage-conformance-probe.mts'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, P374_USAGE_DIR: dir, P375_CORPUS: corpus ? '1' : '0' }
    }
  );
  try {
    const out = JSON.parse(run.stdout.trim().split('\n').at(-1) ?? '');
    return out;
  } catch {
    return { error: `it answered ${String(run.status)} ${(run.stderr ?? '').slice(-200)}` };
  }
}

function digestOfDomain() {
  const hash = createHash('sha256');
  for (const path of DOMAIN_FILES) hash.update(path).update(readFileSync(join(ROOT, path)));
  return hash.digest('hex');
}

// ---------------------------------------------------------------------------
// The ablations. `red` is exactly the rules that must fail.
// ---------------------------------------------------------------------------

/** The parent's ternary, put back over the shipping service. */
const FALL_THROUGH = [
  [
    PROVIDERS,
    `${RECEIVER}: { kind: 'receiver' }`,
    `${RECEIVER}: {
    kind: 'fetch',
    login: 'codex',
    host: CODEX_USAGE_HOST,
    path: CODEX_USAGE_PATH,
    headers: (credential) => codexUsageHeaders(credential.token, credential.accountId ?? ''),
    credential: (deps, loginDir) => readCodexCredential(deps, loginDir),
    parse: (body, _credential, now) => parseCodexUsage(body, now)
  } as never`
  ]
];

const ABLATIONS = [
  // The first one is the defect this gate exists for.
  // Since Phase 375 G12 reads it too: a Codex fetch under the received row's
  // name draws no address that the received file planted.
  { name: 'the Codex fall-through', driven: true, red: ['G1', 'G3', 'G4', 'G5', 'G7', 'G12'], edits: FALL_THROUGH },
  {
    name: 'a second receiver with no port',
    driven: true,
    red: ['G1', 'G3', 'G7'],
    edits: [
      [PROVIDERS, /codex: \{\n {4}kind: 'fetch',[\s\S]*?\n {2}\},\n {2}antigravity/, "codex: { kind: 'receiver' },\n  antigravity"]
    ]
  },
  {
    name: 'a second table in the service',
    red: ['G1'],
    edits: [[SERVICE, 'export const USAGE_POLL_MS', "export const SECOND = { claude: 1, codex: 2 };\nexport const USAGE_POLL_MS"]]
  },
  {
    name: 'the table typed loosely',
    red: ['G1'],
    edits: [[PROVIDERS, 'as const satisfies { readonly [P in UsageProviderId]: EntryOf<P> };', 'as const;']]
  },
  {
    name: 'a fetch allowed for any provider',
    red: ['G1'],
    edits: [[PROVIDERS, '? UsageFetchEntry<P>\n  : UsageReceiverEntry;', '? UsageFetchEntry<P>\n  : UsageProviderEntry;']]
  },
  {
    name: 'a lookup that answers codex',
    red: ['G1'],
    probe: (p) => ({ ...p, lookups: { ...p.lookups, antigravity: { login: 'codex', receiver: true } } }),
    edits: []
  },
  {
    name: 'a ternary on a provider',
    red: ['G2'],
    edits: [[SERVICE, '      const h = held.get(provider);\n', "      const h = held.get(provider === 'claude' ? provider : 'codex');\n"]]
  },
  {
    name: 'a provider compared with a const',
    red: ['G2'],
    edits: [[SERVICE, '    for (const provider of USAGE_PROVIDERS) {\n', "    const first = USAGE_PROVIDERS[0] ?? 'claude';\n    for (const provider of USAGE_PROVIDERS) {\n      if (first !== provider) deps.now();\n"]]
  },
  {
    name: 'a switch on a provider',
    red: ['G2'],
    edits: [[SERVICE, '    for (const provider of USAGE_PROVIDERS) {\n', "    for (const provider of USAGE_PROVIDERS) {\n      switch (provider) { default: break; }\n"]]
  },
  {
    name: 'a list of one, asked whether it includes a provider',
    red: ['G2'],
    edits: [[SERVICE, '      if (entry.kind === \'receiver\') {', "      if (['antigravity'].includes(provider)) deps.now();\n      if (entry.kind === 'receiver') {"]]
  },
  {
    name: "a named login comparison taken out of login-accounts.ts",
    red: ['G2'],
    edits: [[`${DOMAIN}/login-accounts.ts`, "  if (provider === 'claude') {", '  if (deps.home !== null) {']]
  },
  {
    name: 'the folder read above the switch',
    driven: true,
    red: ['G3'],
    edits: [[SERVICE, 'if (on[provider]) receive(now);\n        else receiverOff();', 'receive(now);\n        if (!on[provider]) receiverOff();']]
  },
  {
    name: 'a switch ignored for what is asked',
    driven: true,
    red: ['G3', 'G7'],
    edits: [[SERVICE, '      if (!on[provider]) {', '      if (!on.claude && !on.codex && !on.antigravity) {']]
  },
  {
    name: "Codex's host beside Claude's reader",
    driven: true,
    red: ['G3', 'G4', 'G7'],
    edits: [[PROVIDERS, '    host: CLAUDE_USAGE_HOST,', '    host: CODEX_USAGE_HOST as never,']]
  },
  {
    name: "Claude's reader beside Codex's host",
    driven: true,
    red: ['G3', 'G4', 'G7'],
    edits: [[PROVIDERS, 'credential: (deps, loginDir) => readCodexCredential(deps, loginDir)', 'credential: (deps, loginDir) => readClaudeCredential(deps, loginDir)']]
  },
  {
    name: 'a third host in the domain',
    red: ['G4'],
    edits: [[`${DOMAIN}/transport.ts`, 'export const USAGE_BODY_CAP_BYTES', "export const SPARE = 'cloudcode-pa.googleapis.com';\nexport const USAGE_BODY_CAP_BYTES"]]
  },
  {
    name: 'a host on the receiver',
    driven: true,
    red: ['G1', 'G5'],
    edits: [[PROVIDERS, `${RECEIVER}: { kind: 'receiver' }`, `${RECEIVER}: { kind: 'receiver', host: CODEX_USAGE_HOST } as { kind: 'receiver' }`]]
  },
  {
    name: 'a network module under antigravity',
    red: ['G5'],
    edits: [[RECEIVE, "import type { AntigravityFile } from './folder';", "import type { AntigravityFile } from './folder';\nimport { request } from 'node:https';"]]
  },
  {
    name: 'a credential path under antigravity',
    red: ['G5'],
    edits: [[LAUNCH, "const AGY_PROGRAM = 'agy';", "const AGY_PROGRAM = 'agy';\nexport const SPARE = 'oauth_creds.json';"]]
  },
  {
    name: 'a second path under the home',
    red: ['G5'],
    edits: [[FOLDER, "const SCRIPT_NAME = 'status.sh';", "const SCRIPT_NAME = 'status.sh';\nexport const SPARE = '.gemini/antigravity-cli/log';"]]
  },
  {
    name: 'a file written by a credential reader',
    red: ['G6'],
    edits: [[`${DOMAIN}/credentials.ts`, "import { runGuarded } from '../proc/guarded';", "import { runGuarded } from '../proc/guarded';\nimport { writeFile as put } from 'node:fs/promises';\nexport const spare = put;"]]
  },
  {
    name: 'a vendor program started',
    red: ['G6'],
    edits: [[`${DOMAIN}/credentials.ts`, '  const live = new Set<AbortController>();', "  const live = new Set<AbortController>();\n  void runGuarded('agy', ['-p', '/usage'], { timeoutMs: 1, maxOutputBytes: 1 });"]]
  },
  {
    name: 'a token refresh',
    red: ['G6'],
    edits: [[`${DOMAIN}/transport.ts`, 'export const USAGE_BODY_CAP_BYTES', "export const SPARE = 'grant_type=refresh_token';\nexport const USAGE_BODY_CAP_BYTES"]]
  },
  {
    name: 'a keychain write verb',
    red: ['G6'],
    edits: [[`${DOMAIN}/login-accounts.ts`, "['find-generic-password', '-a', account, '-s', service],", "['add-generic-password', '-a', account, '-s', service],"]]
  },
  {
    name: 'a header moved',
    driven: true,
    red: ['G7'],
    edits: [[`${DOMAIN}/endpoints.ts`, "'openai-beta': CODEX_BETA,", "'openai-beta': `${CODEX_BETA}x`,"]]
  },
  {
    name: 'a request sent twice',
    driven: true,
    red: ['G7'],
    edits: [[SERVICE, '    let res;\n    try {\n', '    let res;\n    try {\n      await deps.transport({ host: entry.host, path: entry.path, headers: entry.headers(cred), signal });\n']]
  },
  {
    name: 'the splice decided before the row',
    red: ['G8'],
    edits: [[CREATE, '  deps.manifest.insertSession(record);\n', ''], [CREATE, '  const [program, ...programArgs] = launchArgv;', '  deps.manifest.insertSession(record);\n  const [program, ...programArgs] = launchArgv;']]
  },
  {
    name: 'the splice before the program',
    red: ['G8'],
    edits: [[CREATE, '[program, ...meterArgs, ...programArgs]', '[...meterArgs, program, ...programArgs]']]
  },
  {
    name: 'the spliced argv recorded',
    red: ['G8'],
    edits: [[CREATE, '  let info: tmux.TmuxSessionInfo;\n', '  deps.manifest.updateSession(id, { argv: spawnArgv });\n  let info: tmux.TmuxSessionInfo;\n']]
  },
  {
    name: 'the splice on a line a restore types',
    red: ['G8'],
    edits: [[RESTORE, '\nimport ', "\nimport { antigravitySettingsJson } from '../usage/antigravity/script';\nexport const spare = antigravitySettingsJson;\nimport "]]
  },
  {
    name: 'a plain create taken off the person’s shell',
    red: ['G8'],
    edits: [[CREATE, '? [antigravityShellLine(program, meterArgs)]\n        : [program', '? [program, ...meterArgs]\n        : [program']]
  },
  {
    name: 'the outputs closed on the sourcing alone',
    driven: true,
    red: ['G9'],
    edits: [[SCRIPT, 'exec >/dev/null 2>&1; [ -r ";', '[ -r ";']]
  },
  {
    name: 'a here-document in the script',
    driven: true,
    red: ['G9'],
    edits: [[SCRIPT, "case $tt_p in *'\"quota\"'* | *'\n'*) ;; *) exit 0 ;; esac", "case $tt_p in *'\"quota\"'* | *'\n'*) ;; *) exit 0 ;; esac\nread -r tt_v <<TT\nx\nTT"]]
  },
  {
    name: 'a fourth key in the settings value',
    driven: true,
    red: ['G9'],
    edits: [[SCRIPT, '      stack_with_default: true\n', '      stack_with_default: true,\n      padding: 0\n']]
  },
  {
    name: 'the reset charset widened',
    driven: true,
    red: ['G9'],
    edits: [[SCRIPT, 't~/^"[0-9TZ:.+-]+"$/)rs[q]', 't~/^"[^"]+"$/)rs[q]']]
  },
  {
    name: 'the plan charset widened',
    driven: true,
    red: ['G9'],
    edits: [[SCRIPT, 't~/^"[A-Za-z][A-Za-z0-9 _-]*"$/)?t:""', 't~/^"[^"]*"$/)?t:""']]
  },
  {
    name: 'the trap taken out of the command',
    driven: true,
    red: ['G9'],
    edits: [[SCRIPT, `const COMMAND_HEAD = "trap 'exit 0' 0; exec`, 'const COMMAND_HEAD = "exec']]
  },
  {
    name: 'the account mark on the row',
    driven: true,
    red: ['G10'],
    edits: [[RECEIVE, '    plan: reading.plan,\n    readAt: reading.at,\n    ...account\n  };\n}\n', '    plan: reading.hash,\n    readAt: reading.at,\n    ...account\n  };\n}\n']]
  },
  {
    name: 'a field named for the account on the snapshot',
    red: ['G10'],
    edits: [[SHARED_USAGE, '  /** The second model group, for the card alone', '  accountHash?: string;\n  /** The second model group, for the card alone']]
  },
  {
    name: 'a body handed to a log line',
    red: ['G10'],
    edits: [[SERVICE, "deps.log('usage.read.dropped', { provider, reason: 'login-changed' });", "deps.log('usage.read.dropped', { provider, reason: 'login-changed', hash: received });"]]
  },
  // Phase 375, one per sink the address could reach (build/p375/SPEC.md §7.2).
  {
    name: 'the received address handed to a log line',
    red: ['G10'],
    edits: [[SERVICE, '      received = heldReading(received, deps.receiver.read(), now);\n', "      received = heldReading(received, deps.receiver.read(), now);\n      deps.log('usage.received', { provider: 'antigravity', who: received?.email });\n"]]
  },
  {
    name: 'the address kept outside its e',
    driven: true,
    red: ['G9'],
    edits: [[SCRIPT, 'tt_l="{\\\\"v\\\\":1,\\\\"h\\\\":\\\\"$tt_h\\\\",$tt_b}"', 'tt_l="{\\\\"v\\\\":1,\\\\"h\\\\":\\\\"$tt_h\\\\",\\\\"m\\\\":$tt_m,$tt_b}"'], [SCRIPT, 'tt_m=\ntt_o=\n', 'tt_o=\n']]
  },
  {
    name: 'the address drawn as the plan',
    driven: true,
    red: ['G10', 'G12'],
    edits: [[RECEIVE, '    plan: reading.plan,\n    readAt: reading.at,\n    ...account\n  };\n}\n', '    plan: reading.email,\n    readAt: reading.at,\n    ...account\n  };\n}\n']]
  },
  {
    name: 'a named exception left behind',
    red: ['G10'],
    edits: [[SHARED_IPC, "  'usage:account': { req: []; res: string | null };\n", '']]
  },
  {
    name: 'the awk class widened past a plain address',
    driven: true,
    corpus: true,
    red: ['G12'],
    edits: [[SCRIPT, 'ad="^\\"[A-Za-z0-9._%+" sq "-]+@', 'ad="^\\"[^\\"]+@']]
  },
  {
    name: 'an email on an asked row',
    driven: true,
    red: ['G12'],
    edits: [[SERVICE, '    retryAfter: held.retryAfter\n  };', '    retryAfter: held.retryAfter,\n    email: null as never\n  };']]
  },
  {
    name: 'the account read asks a read',
    red: ['G12'],
    edits: [[IPC_FILE, '      const row = service.current().providers', '      void usageService().read();\n      const row = service.current().providers']]
  },
  {
    name: 'the door imports the shared usage file',
    red: ['G12'],
    edits: [['src/main/pocket/routes.ts', "import { createHash } from 'node:crypto';\n", "import { createHash } from 'node:crypto';\nimport type { UsageSnapshot } from '@shared/usage';\nexport type Spare = UsageSnapshot;\n"]]
  },
  {
    name: 'Live Diagnostics imports the usage domain',
    red: ['G12'],
    edits: [['src/main/diagnostics/report.ts', "import { randomUUID } from 'node:crypto';\n", "import { randomUUID } from 'node:crypto';\nimport { usageService } from '../usage/ipc';\nexport const spare = usageService;\n"]]
  },
  {
    name: 'a crash annotation naming the account',
    red: ['G12'],
    edits: [['src/main/log/crash.ts', '    crashReporter.start({ uploadToServer: false });\n', "    crashReporter.start({ uploadToServer: false });\n    crashReporter.addExtraParameter('account', String(process.env['TORTIE_P375'] ?? ''));\n"]]
  },
  {
    name: 'the settings value carrying an address',
    driven: true,
    red: ['G12'],
    edits: [[SCRIPT, "const COMMAND_TAIL = '; exit 0';", "const COMMAND_TAIL = '; : p375@example.invalid; exit 0';"]]
  },
  {
    name: 'a third login provider',
    red: ['G1', 'G2', 'G11'],
    edits: [[SHARED_LOGINS, "export type LoginProviderId = 'claude' | 'codex';", "export type LoginProviderId = 'claude' | 'codex' | 'antigravity';"]]
  },
  {
    name: 'the login list widened',
    red: ['G11'],
    edits: [[SHARED_LOGINS, "LOGIN_PROVIDERS: readonly LoginProviderId[] = ['claude', 'codex'];", "LOGIN_PROVIDERS: readonly LoginProviderId[] = ['claude', 'codex', 'claude'];"]]
  }
];

/** One edit's text, over a text. `from` is a string met exactly once, or a pattern. */
function edited(text, from, to, what) {
  if (typeof from === 'string') return replaceOnce(text, from, to, what);
  const out = text.replace(from, to);
  if (out === text) throw new Error(`the edit "${what}" no longer matches`);
  return out;
}

function laidOver(ablation) {
  const edits = new Map();
  for (const [path, from, to] of ablation.edits) {
    let text = edits.has(path) ? edits.get(path) : onDisk(path);
    if (text === null) throw new Error(`${path} is not there`);
    if (path === RESTORE) {
      // The first import of many, so the once only rule does not apply to it.
      const at = text.indexOf(from);
      if (at === -1) throw new Error(`the edit "${ablation.name}" no longer matches`);
      text = text.slice(0, at) + to + text.slice(at + from.length);
    } else {
      text = edited(text, from, to, ablation.name);
    }
    edits.set(path, text);
  }
  return edits;
}

// ---------------------------------------------------------------------------

const problems = [];
const before = digestOfDomain();
const live = tree();
const probe = runProbe(DOMAIN);
const red = judge(live, probe);
for (const [rule, said] of red) {
  for (const one of said.slice(0, 12)) process.stderr.write(`${TAG} FAIL ${rule} ${one}\n`);
  problems.push(rule);
}
let ablated = 0;
if (!LIVE_ONLY) {
  const copies = [];
  const copyOf = (edits) => {
    const dir = mkdtempSync(join(ROOT, 'src/main/.p374-usage-'));
    copies.push(dir);
    cpSync(join(ROOT, DOMAIN), dir, {
      recursive: true,
      filter: (path) => !path.includes('__tests__')
    });
    for (const [path, text] of edits) {
      if (path.startsWith(`${DOMAIN}/`)) writeFileSync(join(dir, path.slice(DOMAIN.length + 1)), text);
    }
    return relative(ROOT, dir);
  };
  try {
    // The control: an unedited copy reads what the tree reads, or no ablation
    // over a copy proves anything.
    const control = judge(live, runProbe(copyOf(new Map())));
    if (!same([...control.keys()], [...red.keys()])) {
      problems.push('control');
      process.stderr.write(`${TAG} FAIL control: an unedited copy reads ${JSON.stringify([...control.keys()])} and the tree ${JSON.stringify([...red.keys()])}\n`);
    }
    for (const one of ABLATIONS) {
      let got;
      try {
        const edits = laidOver(one);
        let reading = one.driven === true ? runProbe(copyOf(edits), one.corpus === true) : probe;
        if (reading.corpus === undefined) reading = { ...reading, corpus: probe.corpus };
        if (one.driven === true && reading.error !== undefined) {
          throw new Error(`the edited copy could not be run: ${reading.error}`);
        }
        if (one.probe !== undefined) reading = one.probe(reading);
        got = judge(tree(edits), reading);
      } catch (err) {
        problems.push(one.name);
        process.stderr.write(`${TAG} FAIL ablation "${one.name}": ${err instanceof Error ? err.message : String(err)}\n`);
        continue;
      }
      const turned = [...got.keys()].filter((rule) => !red.has(rule) || one.red.includes(rule));
      // A rule that could not be READ over an edit has not been shown to catch it.
      const unread = turned.filter((rule) => got.get(rule).every((said) => said.startsWith('the rule could not be read')));
      if (unread.length > 0) {
        problems.push(one.name);
        process.stderr.write(`${TAG} FAIL ablation "${one.name}": ${unread.join(', ')} could not be read over it: ${got.get(unread[0])[0]}\n`);
      } else if (!same(sorted(turned), sorted(one.red))) {
        problems.push(one.name);
        process.stderr.write(`${TAG} FAIL ablation "${one.name}" turned ${JSON.stringify(turned)} red; it owes exactly ${JSON.stringify(one.red)}\n`);
        for (const rule of turned) process.stderr.write(`${TAG}        ${rule} ${got.get(rule)[0]}\n`);
      } else {
        ablated += 1;
        if (VERBOSE) {
          for (const rule of turned) process.stdout.write(`${TAG} red as owed: ${one.name}: ${rule} ${got.get(rule)[0]}\n`);
        }
      }
    }
    // Every rule has at least two ways to fail, or it has not been shown to.
    for (const rule of RULES) {
      const owners = ABLATIONS.filter((one) => one.red.includes(rule)).length;
      if (owners < 2) {
        problems.push(rule);
        process.stderr.write(`${TAG} FAIL ${rule} has ${owners} ablations; it owes two\n`);
      }
    }
  } finally {
    for (const dir of copies) rmSync(dir, { recursive: true, force: true });
  }
}
if (digestOfDomain() !== before) {
  problems.push('restore');
  process.stderr.write(`${TAG} FAIL a shipping file moved while this gate ran\n`);
}
const took = Date.now() - t0;
if (problems.length > 0) {
  process.stderr.write(`${TAG} FAIL: ${[...new Set(problems)].join(', ')} (${took} ms)\n`);
  await exitWhenWritten(1);
}
process.stdout.write(
  LIVE_ONLY
    ? `${TAG} PASS: ${RULES.length} rules, no ablation run (--live) (${took} ms)\n`
    : `${TAG} PASS: ${RULES.length} rules, ${ablated} of ${ABLATIONS.length} ablations red on their own rules, over ${DOMAIN_FILES.length} files (${took} ms)\n`
);
await exitWhenWritten(0);
