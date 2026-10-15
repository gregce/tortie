#!/usr/bin/env node
/**
 * assert-door-only-adds.mjs, `npm run gate:onlyadd` (Phase 333.11, "the
 * door's answers only add", build/p33311/SPEC.md §6; widened by Phase
 * 333.11.1, "Land it, queue the gaps", build/p33311/SPEC-1.md §4, and by
 * Phase 333.11.2, the record held to its history by label,
 * build/p33311/SPEC-2.md §3).
 *
 * WHY IT EXISTS. The phone and the Mac update separately, so a phone on an
 * older build talks to a newer Mac and the reverse. The launch phone in
 * strangers' hands will call the same eleven routes, send the same requests
 * and refuse an answer the same way for as long as it is installed, and
 * `ios/Tortie/Door/Contract.swift` refuses a WHOLE answer when a key it
 * requires is missing. Nothing stopped a Mac release from removing or
 * renaming one, or a route the phone uses. The rule this gate enforces is
 * Paseo's (research 140 §4): "Never flip optional to required, remove a
 * field, or narrow a type." Adding a route, an optional key or a field the
 * phone ignores is allowed; adding a WORD to a closed set the phone refuses
 * outside of, raising a cap past a frozen phone bound, or lowering a limit
 * an old phone's requests fit inside is a narrowing and is not (§3).
 *
 * WHAT IT READS. Every frozen set under `ios/TortieTests/Fixtures/frozen/`:
 * `<label>.wire.json` (written by `--freeze`, never by hand, sealed) and
 * `<label>.vectors.json` (a byte copy of `vectors.json` at the freeze). The
 * phone's shapes in a set were read from the phone's own Swift by
 * `build/p33311/swift-wire.mjs`, never guessed from the Mac's composer (D1).
 * Format 2 (Phase 333.11.1) also seals the REQUEST RECORD, read from the
 * phone's request builders: per route, every query name and body key, whether
 * the phone sends it always or only sometimes, whether it may be null, and
 * the closed set its value is drawn from; and the ASKS, the numbers the
 * phone's own Swift asks of the Mac (the keys write's items and text bytes,
 * the rows a page asks for, how long it keeps a line, how many it holds).
 *
 * THE CLAUSES, each counting what it checked; a count of zero where the set
 * holds items is red, so a scanner that stopped finding is never taken for a
 * clean tree. `npm run ablation:p33311` plants one break per clause.
 *
 *   F1  every wire parses, its `format` is one this gate reads, its seal
 *       holds, and against every committed copy of its LABEL (read only:
 *       SPEC-1 D9; by label since Phase 333.11.2, build/p33311/SPEC-2.md
 *       §3): every `*.wire.json` ever committed directly under the frozen
 *       directory, found over the directory's whole history and grouped by
 *       the `label` it holds, so a set renamed is still compared with every
 *       copy it ever had. (a) A set whose seal differs from a copy of its
 *       label at HEAD carries that copy's seal as the next entry of its
 *       append-only history, or it was edited and resealed by hand; (b) no
 *       Mac-side row (a limit, a bound's Mac constants, an ask) is lower,
 *       shorter or missing against ANY committed copy, because a seal anyone
 *       can recompute does not stop a lowered limit being resealed; since
 *       333.11.1's fix round, no bound re-ruled or loosened, no row moved to
 *       a file the gate's own tables do not name, and no way the frozen
 *       phone asks taken out (a route, a record, a name, a `sometimes`, a
 *       nullable key, a closed set's shape or one of its words); and since
 *       333.11.2, every request a committed copy's vectors hold (the
 *       committed blob whose sha256 is the copy's `vectors.sha256`) stays in
 *       the set's own vectors (the `<label>.vectors.json` beside it; in a
 *       freeze, today's `vectors.json`) by name, method, target and body,
 *       because R2 replays only the requests those vectors hold. (c) A
 *       label any committed copy holds and no working set holds is red
 *       unless RETIRED_SETS names it: a set is retired only on his word, in
 *       one commit that removes its two files, names its label there and
 *       lowers FROZEN_SETS_FLOOR. Without git: (d) a label RETIRED_SETS names is
 *       never held again, and (e) one label names one set. With no `git`,
 *       outside a repository, or in a shallow clone it says so in a note and
 *       decides on the rest, never red and never silent
 *   F2  its vectors file is byte for byte the one its seal names
 *   F3  exactly FROZEN_SETS_FLOOR sets in the frozen directory (since Phase
 *       333.11.2 an equality there, so a retirement lowers it and a new set
 *       raises it; under `--into` and in a freeze at least that many); each
 *       holds together (answers typed, membership hashed, kinds resolved,
 *       instances and arms resolve), and
 *       its arms and unarmed list are EXACTLY what the freeze's own generator
 *       makes from its sealed types, formats and instances (the fix round:
 *       a seal anyone can recompute does not stop a resealed edit, so the
 *       arms are re-derived rather than trusted); and its request record
 *       holds together (one record per frozen route, every word set a sends
 *       row and every query word unreserved, every frozen request on a
 *       recorded route conforming to its record, every way of asking
 *       replayable, every ask well formed)
 *   F4  the gate and the phone half are wired (package.json's build,
 *       verification-checks, test-ios.mjs's P33311_SUITES and P33311_PROOF,
 *       DoorFrozenTests.swift, conformance:ios rule j's vectors.mjs --check)
 *
 *   A NEW MAC WITH AN OLD PHONE
 *   R1  every frozen route is a row of the shipping POCKET_ROUTES, unchanged
 *   R2  every request the frozen phone can make replays through the SHIPPING
 *       route match, URL parse, verifier at its own clock, query readers and
 *       write path: the frozen requests, and every other point of the cross
 *       product of the sealed record (every word of every closed set, a Bool
 *       both ways, every sometimes-sent name absent and present, a nullable
 *       key null and not, a keys write with every key name), each signed as
 *       the frozen phone signs: its own seed, its canonical template and its
 *       body bytes, each proved first on the frozen requests (SPEC-1 §4.4).
 *       At most REPLAY_CEILING a set; past it is red, never sampled. Since
 *       Phase 333.12 the write path is handed the served set of a door set
 *       up with the LAUNCH allowed set (the SHIPPING servedRoutesOf(
 *       allowedRoutesFor(allowedRoutesOf(undefined)), pocketRouteIds())), so
 *       a composition that stopped serving a frozen route is red here
 *   R3  the frozen presentations open under the SHIPPING opener, their proof
 *       holding over the shipping proof text
 *   R4  the Mac's request and connection limits are at least the frozen ones
 *       and at least what the phone's own Swift asks (the asks, read on every
 *       run and held at the largest of today's and every sealed value), and
 *       every word the phone sends is still a word the Mac reads; every
 *       constant read from the file the gate's own tables name for it, never
 *       a sealed row's (the fix round)
 *   R5  main still answers every request the frozen phone can make on a read
 *       route, DRIVEN (the fix round): every read request of R2's replay set,
 *       the frozen ones and every other way the frozen phone asks, goes
 *       through the SHIPPING server.ts handler into ipc.ts's own read switch,
 *       cut out by the parser and transpiled in memory over a recording
 *       `routes`, and must reach routes.<id> once with every word of its
 *       query and be answered 200 with what it answered; every frozen /pair
 *       answer goes through server.ts's pair arm; and every frozen write is a
 *       write route. Since Phase 333.12 server.ts is handed the same launch
 *       served set as R2, so a frozen read a launch store does not serve is
 *       answered 404 here, as it would be to the old phone
 *   R6  phoneIdOf, pairFingerprint, pairingBinding, clientKeyPinOf and
 *       spkiPinOf compute what the old phone computed
 *   R7  a launch-shaped store keeps the eleven's hash (Phase 333.12,
 *       build/p33312/SPEC.md §6.3): a store as a 0.111.x Mac writes it, with
 *       no allowedRoutes, read through the SHIPPING allowedRoutesOf and
 *       allowedRoutesFor, allows exactly the frozen set's routes; the
 *       execution hash over a fixed field set with them equals the hash over
 *       the frozen ids; LEGACY_ALLOWED_ROUTES is the launch set's ids; and the
 *       served set for that store holds every frozen route. A set naming a
 *       route no 0.111.x Mac answered was never paired with such a store, and
 *       is a note
 *   R8  the route ledger only adds (Phase 333.12): every frozen route is a
 *       row of src/main/pocket/route-ledger.ts with its frozen method, path,
 *       signing, window and reads; and against every committed copy of the
 *       ledger (read only, from the same four git reads as F1's copies
 *       since Phase 333.11.2: one `log --raw` over both paths, one `ls-tree`
 *       and one `cat-file --batch`), every row of the copy is in today's
 *       ledger unchanged, by ONE pure function, `ledgerLosses`. No committed copy (true until Phase 333.12 lands), no
 *       git, or a tree that is not its repository's top is a note, never red
 *       and never silent. `--ledger-copy <file>` compares one more copy, a
 *       planted older one (`ablation:p33311` R8h)
 *   A1  today's vectors still hold an instance of every frozen route that had
 *       one, and reach every type the frozen ones reached through required keys
 *   A2  every instance in today's vectors conforms to the frozen phone: keys,
 *       nulls, kinds, closed words, cases, formats and bounds
 *   A3  the Mac's TypeScript answer types still promise every frozen required
 *       key, admit null only where the phone does, and keep every closed
 *       union inside its frozen set (a branch the vectors never compose)
 *   A4  the Mac's caps stay inside the frozen phone's bounds and today's, and
 *       every bound the Mac must hold names at least one Mac constant: the
 *       constants checked are the sealed list joined with the reader's own
 *       BOUND_ROWS list, so an emptied, resealed list holds nothing less;
 *       since the fix round the reader's rule and file are applied whatever
 *       the sealed row names, so a re-ruled or re-filed bound does neither
 *   A5  every status the door answers is one the frozen phone reads
 *
 *   AN OLD MAC WITH A NEW PHONE, read as text
 *   P0  the reader reads today's phone whole, and reads the same bytes the
 *       same way (byte-identical files give an equal projection, its request
 *       record included)
 *   P1  nothing is required today that the frozen phone did not require
 *   P2  no frozen path is narrowed (kind, null, word, case, open to closed)
 *   P3  no phone bound below its frozen value; version, ports and statuses kept
 *   P4  printed, never red: whether today's wire EQUALS each frozen set
 *
 * MODES. `--freeze <label>` reads today's phone and vectors, builds the set,
 * runs every clause against it (F4 is printed and does not block a freeze,
 * because a set is frozen before the gate is wired) and writes both files;
 * it refuses an existing label unless `--replace --why "<sentence>"`, which
 * appends the replaced seal and the reason to `history` and prints every
 * projection, `macLimits` and `asks` line that moved. `--replace` refuses a
 * set whose Mac-side rows are lower, shorter, missing, re-ruled or moved, or
 * that takes out a way the frozen phone asks, or (since Phase 333.11.2)
 * whose vectors drop or change a request the replaced set's own vectors
 * hold, against the one it replaces (F1 (b)'s asks, through the same
 * functions), prints every such row and writes nothing: that is a
 * retirement of the set by the operator's ruling, never a re-freeze (SPEC-1
 * D11). It also refuses, writing nothing, when the replaced set's vectors do
 * not hold together, because then what it froze cannot be compared. A
 * freeze that leaves the frozen directory above FROZEN_SETS_FLOOR prints the
 * reminder to raise it. `--into <dir>` reads and writes the sets in `dir`;
 * `--root <dir>` judges another tree (the ablation's clone); `--ledger-copy
 * <file>`, under `--root`, adds a copy of the route ledger to R8's
 * comparison (it can only add a finding); `--json` ends with one
 * `GATE_ONLYADD:{…}` line.
 *
 * WHAT IT DOES NOT DO. It opens no socket, binds nothing, and starts nothing
 * but the pinned tsx once and `git` read only, at most four commands a run
 * (`rev-parse`, `log`, `ls-tree`, `cat-file --batch`, whatever the history
 * holds, shared by F1's frozen copies and R8's ledger copies), with GIT_OPTIONAL_LOCKS=0, literal pathspecs, no lazy fetch and
 * no global or system git configuration, so it reads none of the person's
 * own git settings, fetches nothing and writes nothing, not even the
 * index. Outside the judged repository it reads nothing under
 * the person's home. Its one Program is `src/shared/ipc/pocket.ts` and
 * `src/main/pocket/pairing.ts`; every other file is parsed alone. It runs
 * itself under the pinned tsx (`build/ts-runner.mjs`) so it can import the
 * shipping TypeScript.
 */

import { spawnSync } from 'node:child_process';
import { createHash, createPrivateKey, createPublicKey, sign as signWith, verify as verifyWith } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(HERE), '..');
const TAG = '[gate:onlyadd]';
const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const valueOf = (flag) => {
  const at = argv.indexOf(flag);
  return at === -1 ? null : (argv[at + 1] ?? null);
};
const ROOT = valueOf('--root') !== null ? resolve(valueOf('--root')) : REPO;

if (process.env.P33311_GATE_INNER !== '1') {
  // THE OUTER RUN: this file again, under the repository's pinned tsx.
  const { tsxCli } = await import('./ts-runner.mjs');
  const run = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', join(ROOT, 'tsconfig.node.json'), HERE, ...argv],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, P33311_GATE_INNER: '1' }
    }
  );
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  if (run.error !== undefined) {
    process.stdout.write(`${TAG} FAIL: ${String(run.error.message)}\n`);
    process.exit(1);
  }
  process.exit(run.status ?? 1);
}

// ---------------------------------------------------------------------------
// THE INNER RUN, under tsx
// ---------------------------------------------------------------------------

const { createRequire } = await import('node:module');
const ts = createRequire(import.meta.url)('typescript');
const reader = await import('./p33311/swift-wire.mjs');

/**
 * A commit that adds a set raises this; a ruled retirement lowers it, in the
 * commit that names the label below (Phase 333.11.2, build/p33311/SPEC-2.md
 * D3). F3 holds the canonical frozen directory to EXACTLY this many sets, so
 * a retirement that removes a set's files without lowering the floor is red,
 * and so is one that lowers the floor without naming the label here.
 */
const FROZEN_SETS_FLOOR = 1;
/**
 * Every frozen set retired by his ruling, label → '<date>: <his words>'. A
 * label any committed copy holds and no working set holds must be named
 * here (F1), and a label named here is never held again (F1).
 */
const RETIRED_SETS = Object.freeze({});
/** A frozen set's label, as `--freeze` takes it and RETIRED_SETS names it. */
const LABEL_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
/**
 * Every wire format this gate reads (§4.1). Format 2 (Phase 333.11.1) is
 * format 1 plus the sealed request record and asks, with format 1's arm
 * generator unchanged. Format 1 was retired by that phase's ruled re-freeze
 * of `launch`, the only set that used it (SPEC-1 D6): a format is retired
 * only by a ruled re-freeze of every set that uses it.
 */
const FORMATS_READ = [2];
/** The format `--freeze` writes. */
const FORMAT_WRITTEN = 2;
/** Why a set of a retired format is red, by format. */
const FORMATS_RETIRED = { 1: "format 1 was retired by Phase 333.11.1's ruled re-freeze; re-freeze with --freeze <label> --replace --why" };
/**
 * The most requests one set may replay, frozen and generated together
 * (SPEC-1 D4): 1,024 replays measured about 160 ms over 46, keeping the gate
 * inside its 3 s budget. A cross product past it is R2 red, never sampled.
 */
const REPLAY_CEILING = 1_024;
const CANONICAL_FROZEN_DIR = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'frozen');
const FROZEN_DIR = valueOf('--into') !== null ? resolve(valueOf('--into')) : CANONICAL_FROZEN_DIR;
const VECTORS_PATH = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json');
const JSON_OUT = has('--json');
const FREEZE = valueOf('--freeze');
const REPLACE = has('--replace');
const WHY = valueOf('--why');
const MAX_FINDINGS = 25;
/** The made-up door the frozen requests are replayed at. */
const BASE = 'https://p33311-mac.tail00000.ts.net:8443';
// Written in sentence case on purpose: the file lives under ios/, where
// conformance:ios rule (f) refuses every token shaped like a NetworkExtension
// class (`NE` and two letters, the first a capital) in any JSON file, and an
// upper-case "never" is one.
const aboutOf = (label) =>
  `The wire Tortie's phone spoke when this set was frozen: the routes it calls, what it requires of each answer, the words and bounds it holds the Mac to, and the arms that prove it. Written by node build/assert-door-only-adds.mjs --freeze ${label}. Never edit it by hand: gate:onlyadd checks the seal on every build.`;

/** The Mac's request and connection limits an old phone was built to fit (§2.4, D5): today >= frozen. */
const MAC_LIMITS = [
  { mac: 'POCKET_KEYS_MAX_ITEMS', file: 'src/shared/ipc/pocket.ts' },
  { mac: 'POCKET_KEYS_MAX_TEXT_BYTES', file: 'src/shared/ipc/pocket.ts' },
  { mac: 'POCKET_SCROLLBACK_MAX_COUNT', file: 'src/shared/ipc/pocket.ts' },
  { mac: 'POCKET_WRITE_BODY_CAPS.end', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'POCKET_WRITE_BODY_CAPS.choose', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'POCKET_WRITE_BODY_CAPS.say', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'POCKET_WRITE_BODY_CAPS.keys', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'POCKET_PAIR_BODY_CAP_BYTES', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'PER_SOURCE_MAX', file: 'src/main/pocket/door/limits.ts' },
  { mac: 'KEEP_ALIVE_TIMEOUT_MS', file: 'src/main/pocket/door/limits.ts' }
];

/**
 * Where the gate's OWN tables say each Mac constant lives (Phase 333.11.1's
 * fix round): MAC_LIMITS and the reader's BOUND_ROWS, ASK_ROWS and
 * SEND_ROWS. R4 and A4 read every constant these tables name from THIS file,
 * never from the file a sealed row names, so a row resealed to point at a
 * decoy that still holds the old value reads nothing less (the reverify's
 * W21 and W22). A constant no table names is read from its sealed file, and
 * F1 (b) holds that file to every committed copy. Two tables naming one
 * constant in two files is the gate's own defect, red on R4.
 */
const GATE_FILES = new Map();
const GATE_FILE_CONFLICTS = [];
for (const [mac, file] of [
  ...MAC_LIMITS.map((r) => [r.mac, r.file]),
  ...reader.BOUND_ROWS.flatMap((r) => r.mac.map((m) => [m, r.macFile])),
  ...reader.ASK_ROWS.map((r) => [r.mac, r.macFile]),
  ...reader.SEND_ROWS.map((r) => [r.mac, r.macFile])
]) {
  if (typeof file !== 'string') continue;
  if (!GATE_FILES.has(mac)) GATE_FILES.set(mac, file);
  else if (GATE_FILES.get(mac) !== file) GATE_FILE_CONFLICTS.push(`the gate's own tables name ${mac} in ${GATE_FILES.get(mac)} and in ${file}`);
}
/** The file the gate's own tables name for a Mac constant, or null. */
const gateFileOf = (mac) => (typeof mac === 'string' && GATE_FILES.has(mac) ? GATE_FILES.get(mac) : null);

const ARM_OPS = { remove: ['refuse'], kind: ['refuse'], null: ['refuse'], fraction: ['refuse', 'accept'], word: ['refuse', 'accept'], add: ['refuse'], format: ['refuse'], older: ['accept'], unknown: ['accept'] };

const CLAUSES = {
  F1: 'every frozen wire parses, its format is read here, its seal holds, one label names one set and a retired one is never reused, and against every committed copy of its label it is neither edited by hand, nor lower on the Mac side, nor asking less, nor missing a frozen request; no committed label is gone unless retired by ruling',
  F2: 'every frozen vectors file is the one its wire names, byte for byte',
  F3: `exactly FROZEN_SETS_FLOOR (${String(FROZEN_SETS_FLOOR)}) frozen set(s), each holding together, its request record agreeing with its vectors`,
  F4: 'the gate and the phone half are wired',
  R1: 'every frozen route is a row of the shipping table, unchanged',
  R2: 'every request the frozen phone can make replays through the shipping door',
  R3: 'the frozen presentations open under the shipping opener',
  R4: "the Mac's limits are at least the frozen ones and the phone's own, and every word the phone sends is still read",
  R5: 'main still answers every request the frozen phone can make on a read route',
  R6: 'the identities an old phone computes are the ones the Mac computes',
  R7: "a store as a 0.111.x Mac writes it keeps the eleven's hash, and the launch routes are served",
  R8: 'the route ledger holds every frozen route as it was frozen, and only adds against every committed copy',
  A1: "today's vectors still cover every frozen route and every required type",
  A2: "every answer in today's vectors conforms to the frozen phone",
  A3: "the Mac's types promise every frozen key and keep every closed word inside its set",
  A4: "the Mac's caps stay inside the frozen and today's phone bounds, and every Mac-held bound names its constants",
  A5: 'every status the door answers is one the frozen phone reads',
  P0: "the reader reads today's phone whole, and the same bytes the same way",
  P1: 'nothing is required today that the frozen phone did not require',
  P2: 'no frozen path is narrowed today',
  P3: 'no phone bound below its frozen value; version, ports and statuses kept',
  P4: "today's phone wire against each frozen set (printed, never red)"
};
const state = Object.fromEntries(Object.keys(CLAUSES).map((c) => [c, { checked: 0, findings: [], expects: false, notes: [] }]));
const checked = (c, n = 1) => {
  state[c].checked += n;
};
const fail = (c, msg) => {
  state[c].findings.push(msg);
};
const expects = (c) => {
  state[c].expects = true;
};
const note = (c, msg) => {
  state[c].notes.push(msg);
};

const sha256hex = (data) => createHash('sha256').update(data).digest('hex');
const relPath = (p) => relative(ROOT, p).split(sep).join('/');
const sealOf = (wire) => {
  const { seal: _seal, ...body } = wire;
  void _seal;
  return sha256hex(reader.canonical(body));
};
/**
 * A closed word set's type is `{ words: [ … ] }`; a discriminated object's
 * `words` is `"open"` or `"closed"` (§4.2). Only the first is a word set.
 */
const isWords = (def) => Array.isArray(def?.words);
const routeOfAnswer = (name) => {
  const at = name.indexOf('-');
  return at === -1 ? name : name.slice(0, at);
};
const membershipOf = (routes) => sha256hex(routes.map((r) => `${r.method} ${r.path}`).sort().join('\n'));
const quietly = async (fn) => {
  // The write path logs one line per write to the console; the gate's own
  // output is its clauses, so those lines are held back while it replays.
  const saved = { log: console.log, warn: console.warn, info: console.info };
  console.log = () => {};
  console.warn = () => {};
  console.info = () => {};
  try {
    return await fn();
  } finally {
    Object.assign(console, saved);
  }
};

// ---------------------------------------------------------------------------
// The shipping modules
// ---------------------------------------------------------------------------

async function load(rel) {
  try {
    return await import(pathToFileURL(join(ROOT, rel)).href);
  } catch (err) {
    return { loadError: `${rel}: ${String(err?.message ?? err)}` };
  }
}
const pairing = await load('src/main/pocket/pairing.ts');
const routesMod = await load('src/main/pocket/routes.ts');
const writesMod = await load('src/main/pocket/writes.ts');
const tableMod = await load('src/main/pocket/door/table.ts');
const limitsMod = await load('src/main/pocket/door/limits.ts');
const serverMod = await load('src/main/pocket/server.ts');
// PHASE 333.12: the allowed and served sets, and the legacy list.
const allowedMod = await load('src/main/pocket/allowed-routes.ts');
const contractMod = await load('src/shared/ipc/pocket.ts');

/**
 * THE LAUNCH SERVED SET (Phase 333.12, build/p33312/SPEC.md §6.3): what a
 * door set up from a store a 0.111.x Mac wrote serves, computed by the
 * SHIPPING functions, never spelled here. R2 and R5 hand it to the write path
 * and to server.ts, so a composition that stopped serving a frozen route
 * answers the frozen phone 404 here. `{ error }` when it cannot be computed.
 */
function launchServed() {
  const missing = [allowedMod, routesMod].map((m) => m.loadError).filter(Boolean);
  if (missing.length > 0) return { error: `the shipping allowed set could not be loaded: ${missing.join('; ')}` };
  try {
    const served = allowedMod.servedRoutesOf(allowedMod.allowedRoutesFor(allowedMod.allowedRoutesOf(undefined)), routesMod.pocketRouteIds());
    if (!Array.isArray(served)) return { error: 'servedRoutesOf answered no list' };
    return { served };
  } catch (err) {
    return { error: `the shipping allowed set threw: ${String(err?.message ?? err)}` };
  }
}

// ---------------------------------------------------------------------------
// TypeScript: one Program, every other file parsed alone, constants folded
// ---------------------------------------------------------------------------

const POCKET_TS = join(ROOT, 'src', 'shared', 'ipc', 'pocket.ts');
const PAIRING_TS = join(ROOT, 'src', 'main', 'pocket', 'pairing.ts');
let programCache = null;
function program() {
  if (programCache !== null) return programCache;
  const configPath = join(ROOT, 'tsconfig.node.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, ROOT);
  const p = ts.createProgram({ rootNames: [POCKET_TS, PAIRING_TS], options: { ...parsed.options, noEmit: true } });
  programCache = { program: p, checker: p.getTypeChecker() };
  return programCache;
}

const parsedFiles = new Map();
/** One file's AST, parsed alone (never compiled). Null when it does not exist. */
function astOf(abs) {
  if (parsedFiles.has(abs)) return parsedFiles.get(abs);
  const sf = existsSync(abs) ? ts.createSourceFile(abs, readFileSync(abs, 'utf8'), ts.ScriptTarget.Latest, true) : null;
  parsedFiles.set(abs, sf);
  return sf;
}

function eachNode(node, visit) {
  visit(node);
  ts.forEachChild(node, (child) => eachNode(child, visit));
}

/** The top-level `const NAME = …` declaration of a file. */
function constDecl(sf, name) {
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue;
    for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === name) return d;
  }
  return null;
}

/** Where an import of a module specifier from `file` lives, or null. */
function moduleFile(fromFile, spec) {
  let base = null;
  if (spec.startsWith('@shared/')) base = join(ROOT, 'src', 'shared', spec.slice('@shared/'.length));
  else if (spec.startsWith('.')) base = resolve(dirname(fromFile), spec);
  if (base === null) return null;
  for (const candidate of [base, `${base}.ts`, join(base, 'index.ts')]) if (existsSync(candidate) && candidate.endsWith('.ts')) return candidate;
  return null;
}

/**
 * Fold an expression to a value (§6.1): numeric literals with `_`, `+ - *`,
 * parentheses, `as const`, `satisfies`, `Object.freeze({ … })`, a readonly
 * tuple or object of literals, a member of one, and an identifier that names
 * such a constant in the same file or one it imports. Anything else throws
 * an Error naming what could not be read.
 */
function foldExpr(node, file, depth = 0) {
  if (depth > 20) throw new Error('a constant that refers to itself');
  const sf = astOf(file);
  if (ts.isNumericLiteral(node)) return Number(node.getText(sf).replace(/_/g, ''));
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression?.(node) || ts.isTypeAssertionExpression?.(node)) {
    return foldExpr(node.expression, file, depth + 1);
  }
  if (ts.isPrefixUnaryExpression(node) && node.operator === ts.SyntaxKind.MinusToken) return -foldExpr(node.operand, file, depth + 1);
  if (ts.isBinaryExpression(node)) {
    const a = foldExpr(node.left, file, depth + 1);
    const b = foldExpr(node.right, file, depth + 1);
    if (node.operatorToken.kind === ts.SyntaxKind.AsteriskToken) return a * b;
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) return a + b;
    if (node.operatorToken.kind === ts.SyntaxKind.MinusToken) return a - b;
  }
  if (ts.isArrayLiteralExpression(node)) return node.elements.map((e) => foldExpr(e, file, depth + 1));
  if (ts.isObjectLiteralExpression(node)) {
    const out = {};
    for (const p of node.properties) {
      if (!ts.isPropertyAssignment(p)) throw new Error(`a property this gate cannot fold: ${p.getText(sf)}`);
      out[p.name.getText(sf).replace(/^['"]|['"]$/g, '')] = foldExpr(p.initializer, file, depth + 1);
    }
    return out;
  }
  if (ts.isCallExpression(node) && node.expression.getText(sf) === 'Object.freeze' && node.arguments.length === 1) {
    return foldExpr(node.arguments[0], file, depth + 1);
  }
  if (ts.isPropertyAccessExpression(node)) {
    const base = foldExpr(node.expression, file, depth + 1);
    if (base === null || typeof base !== 'object' || !(node.name.text in base)) throw new Error(`${node.getText(sf)} names no member`);
    return base[node.name.text];
  }
  if (ts.isIdentifier(node)) return foldName(file, node.text, depth + 1);
  throw new Error(`\`${node.getText(sf)}\` is not a literal, an arithmetic of literals or a constant this gate can fold`);
}

/** The value of exported constant `name` (`A.b` for a member) as `file` sees it. */
function foldName(file, name, depth = 0) {
  const [head, ...members] = name.split('.');
  const sf = astOf(file);
  if (sf === null) throw new Error(`${relPath(file)} does not exist`);
  const decl = constDecl(sf, head);
  let value;
  if (decl !== null && decl.initializer !== undefined) {
    value = foldExpr(decl.initializer, file, depth + 1);
  } else {
    // An import of that name.
    let found = false;
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || st.importClause?.namedBindings === undefined) continue;
      const bindings = st.importClause.namedBindings;
      if (!ts.isNamedImports(bindings)) continue;
      for (const el of bindings.elements) {
        if (el.name.text !== head) continue;
        const target = moduleFile(file, st.moduleSpecifier.text);
        if (target === null) throw new Error(`${head} is imported from ${st.moduleSpecifier.text}, which this gate cannot find`);
        value = foldName(target, (el.propertyName ?? el.name).text, depth + 1);
        found = true;
      }
    }
    if (!found) throw new Error(`${relPath(file)} declares no constant ${head}`);
  }
  for (const m of members) {
    if (value === null || typeof value !== 'object' || !(m in value)) throw new Error(`${head} has no member ${m}`);
    value = value[m];
  }
  return value;
}

/** A Mac constant's value, or `{ error }` naming it (§6.1). */
function macConstant(fileRel, name) {
  const abs = join(ROOT, fileRel);
  try {
    return { value: foldName(abs, name) };
  } catch (err) {
    return { error: `${fileRel}: ${name}: ${String(err.message)}` };
  }
}

/** The words of a Mac list (`array`, a folded constant) or a type alias of string literals (`union`). */
function macWords(fileRel, name, form) {
  if (form === 'array') {
    const c = macConstant(fileRel, name);
    if (c.error !== undefined) return c;
    return Array.isArray(c.value) && c.value.every((w) => typeof w === 'string') ? { value: c.value } : { error: `${name} is not a list of words` };
  }
  const sf = astOf(join(ROOT, fileRel));
  const alias = sf?.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === name);
  if (alias === undefined) return { error: `${fileRel} declares no type ${name}` };
  const words = [];
  const collect = (n) => {
    if (ts.isUnionTypeNode(n)) n.types.forEach(collect);
    else if (ts.isLiteralTypeNode(n) && ts.isStringLiteral(n.literal)) words.push(n.literal.text);
    else throw new Error(`${name} is not a union of string literals`);
  };
  try {
    collect(alias.type);
  } catch (err) {
    return { error: String(err.message) };
  }
  return { value: words };
}

// ---------------------------------------------------------------------------
// The frozen sets, today's vectors, instances
// ---------------------------------------------------------------------------

function loadSets(dir) {
  const sets = [];
  if (!existsSync(dir)) return sets;
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.wire.json')).sort()) {
    const path = join(dir, name);
    const set = { name, path, wire: null, error: null, vectorsBytes: null, vectors: null };
    try {
      set.wire = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      set.error = String(err.message);
    }
    const vf = set.wire?.vectors?.file;
    if (typeof vf === 'string' && !vf.includes('/') && existsSync(join(dir, vf))) {
      set.vectorsBytes = readFileSync(join(dir, vf));
      try {
        set.vectors = JSON.parse(set.vectorsBytes.toString('utf8'));
      } catch {
        set.vectors = null;
      }
    }
    sets.push(set);
  }
  return sets;
}

/** Every instance a vectors file holds, by id, in name order: answers, `/pair` answers, QR payloads. */
function instancesOf(vectors) {
  const out = new Map();
  if (vectors === null || typeof vectors !== 'object') return out;
  const ids = [];
  for (const [name, a] of Object.entries(vectors.answers ?? {})) ids.push([`answers/${name}`, { route: routeOfAnswer(name), text: a?.json, unknownText: a?.withUnknown }]);
  for (const [name, text] of Object.entries(vectors.pairAnswers ?? {})) ids.push([`pairAnswers/${name}`, { route: 'pair', text }]);
  for (const q of vectors.qr ?? []) ids.push([`qr/${String(q?.name)}`, { route: 'qr', text: q?.payload }]);
  ids.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  for (const [id, inst] of ids) out.set(id, inst);
  return out;
}

const rootTypeOf = (wire, route) => (route === 'qr' ? (wire.qr?.answer ?? null) : (wire.routes ?? []).find((r) => r.id === route)?.answer ?? null);

/** The fields an object of `typeName` reads, given the object itself (its tag picks the case). */
function fieldsFor(wire, typeName, value, out = [], seen = new Set()) {
  if (seen.has(typeName)) return out;
  seen.add(typeName);
  const def = wire.types?.[typeName];
  if (def === undefined || isWords(def)) return out;
  if (def.tag !== undefined) {
    out.push({ owner: typeName, key: def.tag, f: { presence: 'required', null: false, kind: 'string' }, isTag: true, def });
    const word = value?.[def.tag];
    const cased = typeof word === 'string' ? def.cases?.[word] : undefined;
    for (const [key, f] of Object.entries(cased ?? {})) out.push({ owner: typeName, key, f, caseWord: word });
  }
  for (const [key, f] of Object.entries(def.fields ?? {})) out.push({ owner: typeName, key, f });
  for (const flat of def.flattens ?? []) fieldsFor(wire, flat, value, out, seen);
  return out;
}

// ---------------------------------------------------------------------------
// Formats and bounds, mirrored from the Swift each row names
// ---------------------------------------------------------------------------

function b64uStrict(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return null;
  return Buffer.from(text, 'base64url');
}
function isPublicName(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text) > 253 || !text.endsWith('.ts.net')) return false;
  const labels = text.split('.');
  return labels.length >= 3 && labels.every((l) => l.length >= 1 && l.length <= 63 && /^[a-z0-9-]+$/.test(l) && !l.startsWith('-') && !l.endsWith('-'));
}
const SPKI_HEADERS = { ed25519Spki: '302a300506032b6570032100', x25519Spki: '302a300506032b656e032100' };
const boundValue = (wire, phone) => (wire.bounds ?? []).find((b) => b.phone === phone)?.value;

function formatHolds(wire, format, v) {
  switch (format) {
    case 'mark':
      return typeof v === 'string' && /^[0-9a-f]{12}$/.test(v);
    case 'questionId':
      return typeof v === 'string' && /^[0-9a-f]{16}-(0|[1-9][0-9]{0,15})$/.test(v);
    case 'certificate': {
      const der = b64uStrict(v);
      return der !== null && der.length > 0;
    }
    case 'version':
      return v === boundValue(wire, 'PairingOffer.version');
    case 'port':
      return (boundValue(wire, 'DoorEndpoint.publicPorts') ?? []).includes(v);
    case 'publicName':
      return isPublicName(v);
    case 'pin': {
      const raw = b64uStrict(v);
      return raw !== null && raw.length === 32 && raw.toString('base64url') === v;
    }
    case 'ed25519Spki':
    case 'x25519Spki': {
      const der = b64uStrict(v);
      return der !== null && der.length === 44 && der.subarray(0, 12).toString('hex') === SPKI_HEADERS[format];
    }
    case 'secret': {
      const raw = b64uStrict(v);
      return raw !== null && raw.length >= 16 && raw.length <= 64;
    }
    case 'positive':
      return typeof v === 'number' && Number.isFinite(v) && v > 0;
    default:
      return false;
  }
}

/** A replacement outside a format, for its refuse arm (§8.2). */
function outsideFormat(format, v) {
  switch (format) {
    case 'mark':
      return '0123456789abc';
    case 'certificate':
      return '!';
    case 'version':
      return typeof v === 'number' ? v + 1 : 0;
    case 'port':
      return 443;
    case 'positive':
      return -1;
    default:
      return 'p33311';
  }
}

// ---------------------------------------------------------------------------
// Conformance (A2): an instance against the frozen phone
// ---------------------------------------------------------------------------

function kindHolds(kind, v) {
  switch (kind) {
    case 'string':
      return typeof v === 'string';
    case 'bool':
      return typeof v === 'boolean';
    case 'double':
      return typeof v === 'number' && Number.isFinite(v);
    case 'int':
      return typeof v === 'number' && Number.isInteger(v);
    case 'count':
      return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;
    case 'color':
      return typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v);
    default:
      return false;
  }
}

function conform(wire, v, kind, path, out, stats) {
  if (typeof kind === 'string') {
    if (!kindHolds(kind, v)) out.push(`${path}: ${JSON.stringify(v)?.slice(0, 60)} is not a ${kind} the phone reads`);
    return;
  }
  if (kind?.array !== undefined) {
    if (!Array.isArray(v)) {
      out.push(`${path}: not an array`);
      return;
    }
    v.forEach((e, i) => conform(wire, e, kind.array, `${path}/${String(i)}`, out, stats));
    return;
  }
  const typeName = kind?.words ?? kind?.type;
  const def = wire.types?.[typeName];
  if (def === undefined) {
    out.push(`${path}: the frozen set has no type ${String(typeName)}`);
    return;
  }
  if (isWords(def)) {
    if (typeof v !== 'string' || !def.words.includes(v)) out.push(`${path}: ${JSON.stringify(v)} is not one of ${typeName}'s words (${def.words.join(', ')})`);
    return;
  }
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    out.push(`${path}: not an object of ${typeName}`);
    return;
  }
  if (def.tag !== undefined) {
    const word = v[def.tag];
    if (typeof word !== 'string') out.push(`${path}/${def.tag}: the tag is missing or not a string`);
    else if (def.cases?.[word] === undefined && def.words === 'closed') out.push(`${path}/${def.tag}: ${JSON.stringify(word)} is not one of ${typeName}'s closed cases (${Object.keys(def.cases ?? {}).join(', ')})`);
  }
  for (const { owner, key, f, isTag, caseWord } of fieldsFor(wire, typeName, v)) {
    if (isTag) continue;
    stats.fields += 1;
    const p = `${path}/${key}`;
    const present = Object.hasOwn(v, key);
    if (f.presence === 'absent') {
      if (present) out.push(`${p}: sent where the phone refuses it (${owner}, case ${String(caseWord)})`);
      continue;
    }
    if (!present) {
      if (f.presence === 'required') out.push(`${p}: missing, and the phone requires it (${owner})`);
      continue;
    }
    const x = v[key];
    if (x === null) {
      if (!f.null) out.push(`${p}: null, and the phone does not accept null (${owner})`);
      continue;
    }
    conform(wire, x, f.kind, p, out, stats);
    for (const row of wire.formats ?? []) {
      if (row.type !== owner || row.key !== key || (row.case !== undefined && row.case !== caseWord)) continue;
      stats.formats += 1;
      if (!formatHolds(wire, row.format, x)) out.push(`${p}: ${JSON.stringify(x)?.slice(0, 40)} is not a ${row.format} (${row.swift})`);
    }
    for (const row of wire.bounds ?? []) {
      if (!(row.applies ?? []).includes(`${owner}.${key}`)) continue;
      const measured = row.measure === 'length' ? (Array.isArray(x) ? x.length : null) : row.measure === 'decoded' ? (b64uStrict(x)?.length ?? null) : typeof x === 'number' ? x : null;
      stats.bounds += 1;
      if (measured === null || measured < (row.min ?? 0) || measured > row.value) out.push(`${p}: ${String(measured)} is outside ${String(row.min ?? 0)} to ${row.phone} (${String(row.value)})`);
    }
  }
}

/** One instance's whole check: parse, its root type, the byte bounds. */
function conformInstance(wire, id, inst, text, out, stats) {
  const root = rootTypeOf(wire, inst.route);
  if (root === null) {
    out.push(`${id}: the frozen set names no route ${inst.route}`);
    return;
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    out.push(`${id}: not JSON`);
    return;
  }
  conform(wire, value, { type: root }, id, out, stats);
  for (const row of wire.bounds ?? []) {
    if (row.measure !== 'bytes') continue;
    const applies = inst.route === 'qr' ? row.applies.includes('qr') : row.applies.includes('answer');
    if (!applies) continue;
    stats.bounds += 1;
    const bytes = Buffer.byteLength(text, 'utf8');
    if (bytes > row.value) out.push(`${id}: ${String(bytes)} bytes, over ${row.phone} (${String(row.value)})`);
  }
}

// ---------------------------------------------------------------------------
// The arms (§8.2), generated at the freeze and sealed
// ---------------------------------------------------------------------------

const ptr = (key) => String(key).replace(/~/g, '~0').replace(/\//g, '~1');

function generateArms(wire, instances) {
  const arms = [];
  const done = new Set();
  const carried = new Set();
  const once = (id) => {
    if (done.has(id)) return false;
    done.add(id);
    return true;
  };
  const add = (arm) => arms.push({ id: `A${String(arms.length + 1).padStart(4, '0')}`, ...arm });
  for (const [instance, inst] of instances) {
    const root = rootTypeOf(wire, inst.route);
    let value;
    try {
      value = JSON.parse(inst.text);
    } catch {
      continue;
    }
    const walk = (v, kind, pointer) => {
      if (kind?.array !== undefined) {
        if (Array.isArray(v) && v.length > 0) walk(v[0], kind.array, `${pointer}/0`);
        return;
      }
      const typeName = kind?.type;
      const def = typeName === undefined ? undefined : wire.types?.[typeName];
      if (def === undefined || isWords(def) || v === null || typeof v !== 'object' || Array.isArray(v)) return;
      const optional = [];
      for (const { owner, key, f, isTag, def: tagDef, caseWord } of fieldsFor(wire, typeName, v)) {
        const fid = `${owner}.${key}`;
        const p = `${pointer}/${ptr(key)}`;
        const present = Object.hasOwn(v, key);
        if (f.presence === 'absent') {
          if (!present && once(`${fid}|add`)) add({ instance, pointer: p, op: 'add', value: 'p33311', expect: 'refuse' });
          continue;
        }
        if (!present) continue;
        if (f.presence === 'optional') optional.push(key);
        const x = v[key];
        if (x === null) continue;
        carried.add(fid);
        if (f.presence === 'required' && once(`${fid}|remove`)) add({ instance, pointer: p, op: 'remove', expect: 'refuse' });
        if (once(`${fid}|kind`)) {
          const replacement = typeof x === 'string' ? 0 : typeof x === 'number' || typeof x === 'boolean' ? 'p33311' : Array.isArray(x) ? {} : [];
          add({ instance, pointer: p, op: 'kind', value: replacement, expect: 'refuse' });
        }
        if (f.presence === 'required' && !f.null && once(`${fid}|null`)) add({ instance, pointer: p, op: 'null', value: null, expect: 'refuse' });
        if (typeof x === 'number' && ['int', 'count', 'double'].includes(f.kind) && once(`${fid}|fraction`)) {
          add({ instance, pointer: p, op: 'fraction', value: x + 0.5, expect: f.kind === 'double' ? 'accept' : 'refuse' });
        }
        if (isTag && once(`${fid}|word`)) add({ instance, pointer: p, op: 'word', value: 'p33311-unknown', expect: tagDef.words === 'closed' ? 'refuse' : 'accept' });
        if (!isTag && f.kind?.words !== undefined && once(`${fid}|word`)) add({ instance, pointer: p, op: 'word', value: 'p33311-unknown', expect: 'refuse' });
        for (const row of wire.formats ?? []) {
          if (row.type !== owner || row.key !== key || (row.case !== undefined && row.case !== caseWord)) continue;
          if (once(`${fid}|format|${row.format}`)) add({ instance, pointer: p, op: 'format', format: row.format, value: outsideFormat(row.format, x), expect: 'refuse' });
        }
        walk(x, f.kind, p);
      }
      if (optional.length > 0 && once(`${typeName}|older`)) add({ instance, pointer, op: 'older', keys: [...optional].sort(), expect: 'accept' });
    };
    if (root !== null) walk(value, { type: root }, '');
    add({ instance, pointer: '', op: 'unknown', key: 'p33311Unknown', value: { nested: [1] }, expect: 'accept' });
  }
  const unarmed = new Set();
  for (const [typeName, def] of Object.entries(wire.types ?? {})) {
    if (isWords(def)) continue;
    const all = [...Object.entries(def.fields ?? {}), ...Object.values(def.cases ?? {}).flatMap((c) => Object.entries(c))];
    for (const [key, f] of all) if (f.presence !== 'absent' && !carried.has(`${typeName}.${key}`)) unarmed.add(`${typeName}.${key}`);
  }
  return { arms, unarmed: [...unarmed].sort() };
}

/** Resolve a JSON pointer in a value: `{ parent, key, found, value }`. */
function resolvePointer(value, pointer) {
  if (pointer === '') return { parent: null, key: null, found: true, value };
  const parts = pointer.split('/').slice(1).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  let cur = value;
  for (let i = 0; i < parts.length - 1; i += 1) {
    if (cur === null || typeof cur !== 'object' || !Object.hasOwn(cur, parts[i])) return { found: false, parentFound: false };
    cur = cur[parts[i]];
  }
  const key = parts[parts.length - 1];
  const parentFound = cur !== null && typeof cur === 'object';
  return { parent: cur, key, parentFound, found: parentFound && Object.hasOwn(cur, key), value: parentFound ? cur[key] : undefined };
}

// ---------------------------------------------------------------------------
// P1/P2: today's phone against a frozen phone, structurally
// ---------------------------------------------------------------------------

function comparePhones(frozen, today, findings) {
  const seen = new Set();
  const fTypes = frozen.types ?? {};
  const tTypes = today.types ?? {};
  const fieldsIn = (types, name, word, acc = {}, guard = new Set()) => {
    const def = types[name];
    if (def === undefined || guard.has(name)) return acc;
    guard.add(name);
    Object.assign(acc, def.fields ?? {});
    if (word !== null && def.cases?.[word] !== undefined) Object.assign(acc, def.cases[word]);
    for (const flat of def.flattens ?? []) fieldsIn(types, flat, word, acc, guard);
    return acc;
  };
  /** Whether today's kind accepts every value the frozen kind accepted; pairs of types are compared as they are met. */
  const covers = (tk, fk, path) => {
    if (typeof fk === 'string' || typeof tk === 'string') {
      if (typeof tk === 'string' && typeof fk === 'string') return tk === fk || (fk === 'color' && tk === 'string') || (fk === 'count' && (tk === 'int' || tk === 'double')) || (fk === 'int' && tk === 'double');
      if (tk === 'string' && fk?.words !== undefined) return true;
      return false;
    }
    if (fk?.array !== undefined) return tk?.array !== undefined && covers(tk.array, fk.array, `${path}[]`);
    if (fk?.words !== undefined) {
      const fw = fTypes[fk.words]?.words ?? [];
      const tw = tk?.words !== undefined ? tTypes[tk.words]?.words : null;
      if (tw === null || tw === undefined) return false;
      const lost = fw.filter((w) => !tw.includes(w));
      if (lost.length > 0) findings.p2.push(`${path}: the phone no longer accepts ${lost.join(', ')}`);
      return true;
    }
    if (fk?.type !== undefined) {
      if (tk?.type === undefined) return false;
      pair(fk.type, tk.type, path);
      return true;
    }
    return false;
  };
  const pair = (fName, tName, path) => {
    const key = `${fName}|${tName}`;
    if (seen.has(key)) return;
    seen.add(key);
    const f = fTypes[fName];
    const t = tTypes[tName];
    if (f === undefined || t === undefined) {
      if (t === undefined) findings.p2.push(`${path}: today's phone reads no type ${tName}`);
      return;
    }
    if (isWords(f)) {
      if (!isWords(t)) findings.p2.push(`${path}: ${tName} is no longer a word set`);
      else {
        const lost = f.words.filter((w) => !t.words.includes(w));
        if (lost.length > 0) findings.p2.push(`${path}: the phone no longer accepts ${lost.join(', ')}`);
      }
      return;
    }
    // Discriminants: a frozen case is still a case; open never becomes closed.
    if (f.tag !== undefined) {
      if (t.tag !== f.tag) findings.p2.push(`${path}: discriminated by ${String(t.tag)} today, by ${f.tag} when frozen`);
      else {
        for (const w of Object.keys(f.cases ?? {})) if (t.cases?.[w] === undefined) findings.p2.push(`${path}: ${w} is no longer a case of ${tName}`);
        if (f.words === 'open' && t.words === 'closed') findings.p2.push(`${path}: ${tName}'s words were open and are closed today`);
      }
    } else if (t.tag !== undefined && t.words === 'closed') {
      findings.p2.push(`${path}: ${tName} is a closed discriminated set today and was not when frozen`);
    }
    const fCases = f.tag !== undefined ? Object.keys(f.cases ?? {}) : [null];
    const tCases = t.tag !== undefined ? Object.keys(t.cases ?? {}) : [null];
    // P1: nothing required today that the frozen phone did not require (same case).
    for (const w of tCases) {
      const tFields = fieldsIn(tTypes, tName, w);
      const frozenWord = f.tag !== undefined ? (w !== null && f.cases?.[w] !== undefined ? w : undefined) : null;
      if (frozenWord === undefined) continue;
      const fFields = fieldsIn(fTypes, fName, frozenWord);
      for (const [k, tf] of Object.entries(tFields)) {
        if (tf.presence !== 'required') continue;
        const ff = fFields[k];
        if (ff === undefined || ff.presence !== 'required') {
          findings.p1.push(`${path}/${k}${w === null ? '' : ` (case ${w})`}: required today, ${ff === undefined ? 'not read' : ff.presence} when frozen`);
        }
      }
    }
    // P2: every frozen path still accepts what it accepted.
    for (const w of fCases) {
      const fFields = fieldsIn(fTypes, fName, w);
      const todayWord = t.tag !== undefined ? (w !== null && t.cases?.[w] !== undefined ? w : undefined) : null;
      if (todayWord === undefined) continue;
      const tFields = fieldsIn(tTypes, tName, todayWord);
      for (const [k, ff] of Object.entries(fFields)) {
        if (ff.presence === 'absent') continue;
        const tf = tFields[k];
        const p = `${path}/${k}${w === null ? '' : ` (case ${w})`}`;
        if (tf === undefined) continue;
        if (tf.presence === 'absent') {
          findings.p2.push(`${p}: refused today, accepted when frozen`);
          continue;
        }
        if (ff.null && !tf.null) findings.p2.push(`${p}: null was accepted when frozen and is not today`);
        if (!covers(tf.kind, ff.kind, p)) findings.p2.push(`${p}: narrowed from ${JSON.stringify(ff.kind)} to ${JSON.stringify(tf.kind)}`);
      }
    }
  };
  for (const fr of frozen.routes ?? []) {
    const tr = (today.routes ?? []).find((r) => r.method === fr.method && r.path === fr.path);
    if (tr === undefined) {
      // A phone that stops calling a route asks nothing more of an old Mac.
      // A READER that stopped seeing a call is P0's: every `<x>Target` the
      // network file spells must be accounted for (swift-wire.mjs).
      findings.notes.push(`${fr.method} ${fr.path}: today's phone calls it no more, so its answer is not compared`);
      continue;
    }
    findings.pairs += 1;
    if (tr.signed !== fr.signed) findings.p2.push(`${fr.method} ${fr.path}: signed ${String(tr.signed)} today, ${String(fr.signed)} when frozen`);
    pair(fr.answer, tr.answer, `${fr.method} ${fr.path}`);
  }
  if (frozen.qr?.answer !== undefined && today.qr?.answer !== null && today.qr?.answer !== undefined) {
    findings.pairs += 1;
    pair(frozen.qr.answer, today.qr.answer, 'qr');
  }
}

// ---------------------------------------------------------------------------
// A3: the Mac's TypeScript types against the frozen phone
// ---------------------------------------------------------------------------

function tsChecks(wire, findings, counts) {
  const { program: p, checker } = program();
  const F = ts.TypeFlags;
  const partsOf = (t) => (t.isUnion() ? t.types : [t]);
  const nonNull = (t) => partsOf(t).filter((x) => (x.flags & (F.Null | F.Undefined | F.Void)) === 0);
  const hasNull = (t) => partsOf(t).some((x) => (x.flags & F.Null) !== 0);
  const hasUndefined = (t) => partsOf(t).some((x) => (x.flags & (F.Undefined | F.Void)) !== 0);
  const exported = (file, name) => {
    const sf = p.getSourceFile(file);
    const mod = sf === undefined ? undefined : checker.getSymbolAtLocation(sf);
    if (mod === undefined) return null;
    let sym = checker.getExportsOfModule(mod).find((s) => s.name === name);
    if (sym === undefined) return null;
    if ((sym.flags & ts.SymbolFlags.Alias) !== 0) sym = checker.getAliasedSymbol(sym);
    return checker.getDeclaredTypeOfSymbol(sym);
  };
  const elementOf = (t) => {
    if (checker.isArrayType(t) || checker.isTupleType(t)) return checker.getTypeArguments(t)[0] ?? null;
    return t.getNumberIndexType?.() ?? null;
  };
  const seen = new Set();
  const kindCheck = (t, kind, path) => {
    counts.paths += 1;
    const ps = nonNull(t);
    if (ps.length === 0) {
      findings.push(`${path}: never anything but null`);
      return;
    }
    if (kind === 'string' || kind === 'color') {
      if (!ps.every((x) => (x.flags & F.StringLike) !== 0)) findings.push(`${path}: ${checker.typeToString(t)} is not a string`);
      return;
    }
    if (kind === 'bool') {
      if (!ps.every((x) => (x.flags & F.BooleanLike) !== 0)) findings.push(`${path}: ${checker.typeToString(t)} is not a boolean`);
      return;
    }
    if (kind === 'double' || kind === 'int' || kind === 'count') {
      if (!ps.every((x) => (x.flags & F.NumberLike) !== 0)) findings.push(`${path}: ${checker.typeToString(t)} is not a number`);
      return;
    }
    if (kind?.array !== undefined) {
      for (const x of ps) {
        const e = elementOf(x);
        if (e === null) findings.push(`${path}: ${checker.typeToString(x)} is not an array`);
        else kindCheck(e, kind.array, `${path}[]`);
      }
      return;
    }
    const typeName = kind?.words ?? kind?.type;
    const def = wire.types?.[typeName];
    if (def === undefined) {
      findings.push(`${path}: the frozen set has no type ${String(typeName)}`);
      return;
    }
    if (isWords(def)) {
      counts.words += 1;
      for (const x of ps) {
        if (!x.isStringLiteral()) findings.push(`${path}: ${checker.typeToString(x)} where the phone holds the closed set ${typeName} (${def.words.join(', ')}): a Mac that may send any string`);
        else if (!def.words.includes(x.value)) findings.push(`${path}: '${x.value}' is a word the frozen phone refuses (${typeName}: ${def.words.join(', ')})`);
      }
      return;
    }
    for (const x of ps) objectCheck(x, typeName, path);
  };
  const objectCheck = (t, typeName, path) => {
    const key = `${typeName}|${String(t.id)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const def = wire.types[typeName];
    let word = null;
    if (def.tag !== undefined) {
      const tagProp = checker.getPropertyOfType(t, def.tag);
      if (tagProp === undefined) {
        findings.push(`${path}: ${checker.typeToString(t)} carries no ${def.tag}`);
        return;
      }
      const tagType = checker.getTypeOfSymbol(tagProp);
      const words = nonNull(tagType).filter((x) => x.isStringLiteral()).map((x) => x.value);
      if (words.length !== nonNull(tagType).length) {
        if (def.words === 'closed') findings.push(`${path}/${def.tag}: ${checker.typeToString(tagType)} where the phone holds a closed set of cases`);
      }
      for (const w of words) {
        if (def.cases?.[w] === undefined) {
          if (def.words === 'closed') findings.push(`${path}/${def.tag}: '${w}' is a case the frozen phone refuses (${Object.keys(def.cases ?? {}).join(', ')})`);
          continue;
        }
        word = w;
      }
      if (words.length !== 1) word = null;
    }
    const fields = {};
    const gather = (name, guard = new Set()) => {
      if (guard.has(name)) return;
      guard.add(name);
      const d = wire.types[name];
      if (d === undefined) return;
      for (const [k, f] of Object.entries(d.fields ?? {})) fields[k] = f;
      if (word !== null) for (const [k, f] of Object.entries(d.cases?.[word] ?? {})) fields[k] = f;
      for (const flat of d.flattens ?? []) gather(flat, guard);
    };
    gather(typeName);
    for (const [k, f] of Object.entries(fields)) {
      const prop = checker.getPropertyOfType(t, k);
      const p2 = `${path}/${k}`;
      counts.paths += 1;
      if (f.presence === 'absent') {
        if (prop !== undefined && (prop.flags & ts.SymbolFlags.Optional) === 0) findings.push(`${p2}: the Mac's type carries a key the phone refuses here`);
        continue;
      }
      if (prop === undefined) {
        if (f.presence === 'required') findings.push(`${p2}: the Mac's type no longer has it, and the frozen phone requires it`);
        continue;
      }
      const pt = checker.getTypeOfSymbol(prop);
      if (f.presence === 'required' && ((prop.flags & ts.SymbolFlags.Optional) !== 0 || hasUndefined(pt))) {
        findings.push(`${p2}: optional in the Mac's type (${checker.typeToString(pt)}), and the frozen phone requires it`);
      }
      if (hasNull(pt) && !f.null) findings.push(`${p2}: the Mac's type admits null (${checker.typeToString(pt)}), and the frozen phone does not`);
      kindCheck(pt, f.kind, p2);
    }
  };
  // The answer type of every frozen route, as the Mac declares it.
  const routesAst = astOf(join(ROOT, 'src', 'main', 'pocket', 'routes.ts'));
  const composer = routesAst?.statements.find((s) => ts.isFunctionDeclaration(s) && s.name?.text === 'createPocketRoutes');
  const members = new Map();
  if (composer?.type !== undefined && ts.isTypeLiteralNode(composer.type)) {
    for (const m of composer.type.members) {
      if (!ts.isMethodSignature(m) || m.type === undefined) continue;
      let n = m.type;
      if (ts.isTypeReferenceNode(n) && n.typeName.getText(routesAst) === 'Promise' && n.typeArguments?.length === 1) n = n.typeArguments[0];
      if (ts.isUnionTypeNode(n)) {
        const rest = n.types.filter((x) => !(ts.isLiteralTypeNode(x) && x.literal.kind === ts.SyntaxKind.NullKeyword));
        if (rest.length === 1) n = rest[0];
      }
      members.set(m.name.getText(routesAst), ts.isTypeReferenceNode(n) && ts.isIdentifier(n.typeName) ? n.typeName.text : null);
    }
  } else {
    findings.push('src/main/pocket/routes.ts: createPocketRoutes declares no return type literal this gate can read');
  }
  for (const route of wire.routes ?? []) {
    let file = POCKET_TS;
    let name;
    if (route.id === 'pair') {
      file = PAIRING_TS;
      name = 'PocketPairAnswer';
    } else if (route.reads === false) {
      name = 'PocketWriteAnswer';
    } else {
      name = members.get(route.id);
      if (name === undefined || name === null) {
        findings.push(`${route.id}: createPocketRoutes declares no member answering it with a named type`);
        continue;
      }
    }
    const t = exported(file, name);
    if (t === null) {
      findings.push(`${route.id}: ${relPath(file)} exports no ${name}`);
      continue;
    }
    counts.routes += 1;
    kindCheck(t, { type: route.answer }, `${route.id} (${name})`);
  }
}

// ---------------------------------------------------------------------------
// The request record and the replay set (Phase 333.11.1, SPEC-1 §2.2, §4.3, §4.4)
// ---------------------------------------------------------------------------

const RECORD_SENT = ['always', 'sometimes'];
const ASK_RULES = ['mac>=phone', 'mac>phone*1000'];
/** A name or key the point leaves out, as a `sometimes` one is. */
const ABSENT = Symbol('absent');
const isPlainObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const shortJson = (x) => (x === ABSENT ? 'absent' : String(JSON.stringify(x)).slice(0, 60));
const requestPath = (r) => String(r?.target ?? '').split('?')[0];
/** Whether a vectors request is on a record's route: its method compared in capitals, as the canonical text writes it. */
const onRecord = (r, rec) => String(r?.method ?? '').toUpperCase() === rec.method && requestPath(r) === rec.path;

/** Whether a record value is in the closed vocabulary: text, int, bool, words, array, oneOf (SPEC-1 §2.2). */
function recordValueOk(v) {
  if (v === 'text' || v === 'int' || v === 'bool') return true;
  if (!isPlainObject(v) || Object.keys(v).length !== 1) return false;
  if (typeof v.words === 'string') return v.words !== '';
  if (v.array !== undefined) return recordValueOk(v.array);
  if (Array.isArray(v.oneOf)) {
    const keys = new Set();
    for (const alt of v.oneOf) {
      if (!isPlainObject(alt) || Object.keys(alt).length !== 2 || typeof alt.key !== 'string' || alt.key === '' || keys.has(alt.key) || !recordValueOk(alt.value)) return false;
      keys.add(alt.key);
    }
    return keys.size > 0;
  }
  return false;
}

/** Why one sealed record is outside the vocabulary, or null. */
function recordShapeProblem(rec) {
  if (!isPlainObject(rec)) return 'it is not an object';
  if (typeof rec.method !== 'string' || typeof rec.path !== 'string' || !rec.path.startsWith('/')) return 'it names no method and path';
  if (!Array.isArray(rec.query)) return 'its query is not a list';
  const names = new Set();
  for (const q of rec.query) {
    if (!isPlainObject(q) || typeof q.name !== 'string' || q.name === '' || !RECORD_SENT.includes(q.sent) || !recordValueOk(q.value)) return `its query item ${shortJson(q)} is not { name, sent, value } in the record's vocabulary`;
    if (names.has(q.name)) return `it names the query name ${q.name} twice`;
    names.add(q.name);
  }
  if (rec.body === null) return null;
  if (!isPlainObject(rec.body) || Object.keys(rec.body).length !== 1) return 'its body is not null, { fields } or { opaque: "presentation" }';
  if (rec.query.length > 0) return 'it names both a query and a body, and the phone writes no query on a request with a body';
  if (rec.body.opaque !== undefined) return rec.body.opaque === 'presentation' ? null : `its opaque body is ${shortJson(rec.body.opaque)}, not "presentation"`;
  if (!Array.isArray(rec.body.fields)) return 'its body is not null, { fields } or { opaque: "presentation" }';
  let last = null;
  for (const f of rec.body.fields) {
    if (!isPlainObject(f) || typeof f.name !== 'string' || f.name === '' || !RECORD_SENT.includes(f.sent) || typeof f.null !== 'boolean' || !recordValueOk(f.value)) return `its body field ${shortJson(f)} is not { name, sent, null, value } in the record's vocabulary`;
    if (last !== null && !(last < f.name)) return `its body fields are not sorted by key (${last}, then ${f.name}), as the phone writes them`;
    last = f.name;
  }
  return null;
}

/** Every word set a record value names. */
function wordSetsIn(v, out = new Set()) {
  if (!isPlainObject(v)) return out;
  if (typeof v.words === 'string') out.add(v.words);
  if (v.array !== undefined) wordSetsIn(v.array, out);
  if (Array.isArray(v.oneOf)) for (const alt of v.oneOf) wordSetsIn(alt?.value, out);
  return out;
}

/** A target's query as it is spelled: `[name, raw value]` pairs, still percent-encoded; a pair with no `=` has a null value. */
function rawQuery(target) {
  const t = String(target ?? '');
  const at = t.indexOf('?');
  if (at === -1 || at === t.length - 1) return [];
  return t.slice(at + 1).split('&').map((p) => {
    const eq = p.indexOf('=');
    return eq === -1 ? [p, null] : [p.slice(0, eq), p.slice(eq + 1)];
  });
}

/**
 * THE FROZEN PHONE'S BODY BYTES (SPEC-1 D3): `JSONEncoder` with
 * `.sortedKeys`, which writes every `/` as `\/`. Proved on every frozen write
 * body before any generated body is written with it.
 */
const swiftString = (s) => JSON.stringify(s).replace(/\//g, '\\/');
function swiftJson(v) {
  if (Array.isArray(v)) return `[${v.map(swiftJson).join(',')}]`;
  if (isPlainObject(v)) return `{${Object.keys(v).sort().map((k) => `${swiftString(k)}:${swiftJson(v[k])}`).join(',')}}`;
  if (typeof v === 'string') return swiftString(v);
  return JSON.stringify(v);
}

/** A request's values by record name: the raw query (a GET) or the parsed body (a POST), or null when the body is not an object. */
function requestValues(rec, r) {
  if (rec.body === null) return new Map(rawQuery(r.target));
  try {
    const body = JSON.parse(String(r.body ?? ''));
    return isPlainObject(body) ? new Map(Object.entries(body)) : null;
  } catch {
    return null;
  }
}

/** One JSON value against its record kind. */
function conformJson(v, kind, wordsOf, where, out) {
  if (kind === 'text') {
    if (typeof v !== 'string') out.push(`${where}: ${shortJson(v)} is not text`);
  } else if (kind === 'int') {
    if (!Number.isInteger(v)) out.push(`${where}: ${shortJson(v)} is not a whole number`);
  } else if (kind === 'bool') {
    if (typeof v !== 'boolean') out.push(`${where}: ${shortJson(v)} is not a boolean`);
  } else if (typeof kind?.words === 'string') {
    const words = wordsOf(kind.words);
    if (typeof v !== 'string' || words === null || !words.includes(v)) out.push(`${where}: ${shortJson(v)} is not one of ${kind.words}'s words`);
  } else if (kind?.array !== undefined) {
    if (!Array.isArray(v)) out.push(`${where}: ${shortJson(v)} is not a list`);
    else v.forEach((e, i) => conformJson(e, kind.array, wordsOf, `${where}/${String(i)}`, out));
  } else if (Array.isArray(kind?.oneOf)) {
    const alt = isPlainObject(v) && Object.keys(v).length === 1 ? kind.oneOf.find((a) => a.key === Object.keys(v)[0]) : undefined;
    if (alt === undefined) out.push(`${where}: ${shortJson(v)} is none of its ${kind.oneOf.map((a) => `{ ${a.key} }`).join(' or ')} shapes`);
    else conformJson(v[alt.key], alt.value, wordsOf, `${where}/${alt.key}`, out);
  } else out.push(`${where}: a kind this gate cannot read (${shortJson(kind)})`);
}

/** One raw query value against its record kind. */
function conformRaw(raw, kind, wordsOf, where, out) {
  if (raw === null) out.push(`${where}: it is sent with no value`);
  else if (kind === 'int') {
    if (!/^-?(0|[1-9][0-9]*)$/.test(raw)) out.push(`${where}: ${shortJson(raw)} is not a whole number`);
  } else if (kind === 'bool') {
    if (raw !== 'true' && raw !== 'false') out.push(`${where}: ${shortJson(raw)} is not a boolean`);
  } else if (typeof kind?.words === 'string') {
    const words = wordsOf(kind.words);
    if (words === null || !words.includes(raw)) out.push(`${where}: ${shortJson(raw)} is not one of ${kind.words}'s words`);
  } else if (kind !== 'text') out.push(`${where}: a query value of kind ${shortJson(kind)} cannot be read`);
}

/**
 * A frozen vectors request against its record (F3): its names in the
 * record's order, every `always` name present, no other name, a word inside
 * its set, a whole number a whole number, a `bool` a boolean, `null` only
 * where allowed, every item one of the `oneOf` shapes.
 */
function conformRequest(rec, r, wordsOf) {
  const out = [];
  const where = `request ${String(r?.name)}`;
  const items = rec.body === null ? rec.query : rec.body.fields;
  let names;
  if (rec.body === null) {
    const pairs = rawQuery(r.target);
    names = pairs.map(([n]) => n);
    const seen = new Set();
    for (const n of names) {
      if (seen.has(n)) out.push(`${where}: it sends ${n} twice`);
      seen.add(n);
    }
    const values = new Map(pairs);
    for (const it of items) if (values.has(it.name)) conformRaw(values.get(it.name), it.value, wordsOf, `${where} ${it.name}`, out);
  } else {
    const values = requestValues(rec, r);
    if (values === null) return [`${where}: its body is not a JSON object`];
    names = [...values.keys()];
    for (const it of items) {
      if (!values.has(it.name)) continue;
      const x = values.get(it.name);
      if (x === null) {
        if (!it.null) out.push(`${where} ${it.name}: null, and its record says the phone never sends null there`);
        continue;
      }
      conformJson(x, it.value, wordsOf, `${where} ${it.name}`, out);
    }
  }
  const order = items.map((it) => it.name);
  let last = -1;
  for (const n of names) {
    const at = order.indexOf(n);
    if (at === -1) {
      out.push(`${where}: it sends ${n}, which its record does not name`);
      continue;
    }
    if (at < last) out.push(`${where}: it sends ${n} out of its record's order (${order.join(', ')})`);
    last = Math.max(last, at);
  }
  for (const it of items) if (it.sent === 'always' && !names.includes(it.name)) out.push(`${where}: it does not send ${it.name}, which its record says the phone always sends`);
  return out;
}

/**
 * EVERY WAY ONE ROUTE CAN BE ASKED (SPEC-1 §4.4 steps 2 to 4), from the
 * SEALED record and the FROZEN requests only: the launch phone is the one
 * frozen, so today's reading never widens or narrows what it asks.
 *
 * A query item or body field is a DIMENSION when its value is a word set
 * (every word, in its sends row's order), a `bool` (false, then true), sent
 * only `sometimes` (absent, then the present form), `null: true` (null, then
 * the first non-null value any frozen request on the route sends), or a list
 * whose `oneOf` has a word alternative (every distinct list the frozen
 * requests send, by the frozen phone's bytes, in vectors order, then a
 * one-item list for every word not already one). Everything else takes the
 * BASE's value as it is: the first frozen request on the route that holds
 * every name (a GET) or every always-sent key (a POST). A value that is not a
 * dimension (an id, a whole number, free text) is never invented.
 */
function planOf(rec, requests, wordsOf) {
  const problems = [];
  const onRoute = requests.filter((r) => onRecord(r, rec));
  const plan = { rec, onRoute, opaque: false, isGet: rec.body === null, items: [], dims: [], base: null, problems };
  if (isPlainObject(rec.body) && rec.body.opaque !== undefined) return { ...plan, opaque: true };
  const isGet = rec.body === null;
  const items = isGet ? rec.query : rec.body.fields;
  plan.items = items;
  const parsed = onRoute.map((r) => ({ r, values: requestValues(rec, r) }));
  plan.parsed = parsed;
  const holdsBase = ({ values }) => values !== null && items.every((it) => (!isGet && it.sent !== 'always') || values.has(it.name));
  const base = parsed.find(holdsBase);
  if (base === undefined) {
    problems.push(`${rec.method} ${rec.path}: no frozen request on it holds every ${isGet ? 'name' : 'always-sent key'} of its record, so no other way it asks can be built`);
    return plan;
  }
  plan.base = base;
  for (const it of items) {
    const v = it.value;
    const keyOf = isGet ? (x) => x : (x) => swiftJson(x);
    let present = null;
    if (isPlainObject(v) && typeof v.words === 'string') {
      const words = wordsOf(v.words);
      if (words === null) {
        problems.push(`${rec.method} ${rec.path}: ${it.name} is drawn from ${v.words}, which no sends row holds`);
        continue;
      }
      present = [...words];
    } else if (v === 'bool') {
      present = isGet ? ['false', 'true'] : [false, true];
    } else if (!isGet && isPlainObject(v?.array) && Array.isArray(v.array.oneOf) && v.array.oneOf.some((a) => typeof a?.value?.words === 'string')) {
      const lists = new Map();
      for (const { values } of parsed) {
        const x = values?.get(it.name);
        if (Array.isArray(x) && !lists.has(swiftJson(x))) lists.set(swiftJson(x), x);
      }
      for (const alt of v.array.oneOf) {
        if (typeof alt?.value?.words !== 'string') continue;
        for (const word of wordsOf(alt.value.words) ?? []) {
          const one = [{ [alt.key]: word }];
          if (!lists.has(swiftJson(one))) lists.set(swiftJson(one), one);
        }
      }
      present = [...lists.values()];
    }
    const absentable = it.sent === 'sometimes';
    const nullable = !isGet && it.null === true;
    let single = false;
    if (present === null) {
      if (!absentable && !nullable) continue;
      const sent = (m) => m?.has(it.name) === true && m.get(it.name) !== null;
      const first = parsed.find(({ values }) => sent(values));
      const rep = !nullable && sent(base.values) ? base.values.get(it.name) : first?.values.get(it.name);
      if (rep === undefined) {
        problems.push(`${rec.method} ${rec.path}: ${it.name} is ${absentable ? 'sent only sometimes' : 'sent as null or not'}, and no frozen request on the route sends a value for it, so the other form cannot be replayed`);
        continue;
      }
      present = [rep];
      single = true;
    }
    const choices = [...(nullable ? [null] : []), ...(absentable ? [ABSENT] : []), ...present];
    if (choices.length > 1) plan.dims.push({ name: it.name, choices, single, keyOf });
  }
  return plan;
}

/** The point a frozen request names on a plan's dimensions, or null when it names none (F3 says why). */
function pointOf(plan, values) {
  if (values === null) return null;
  let index = 0;
  for (const dim of plan.dims) {
    let at;
    if (!values.has(dim.name)) at = dim.choices.indexOf(ABSENT);
    else if (values.get(dim.name) === null) at = dim.choices.indexOf(null);
    else if (dim.single) at = dim.choices.length - 1;
    else {
      const key = dim.keyOf(values.get(dim.name));
      at = dim.choices.findIndex((c) => c !== ABSENT && c !== null && dim.keyOf(c) === key);
    }
    if (at < 0) return null;
    index = index * dim.choices.length + at;
  }
  return index;
}

/** How many ways a plan's route can be asked: the size of its cross product. */
const waysOf = (plan) => plan.dims.reduce((n, d) => n * d.choices.length, 1);

/**
 * THE PROOFS (SPEC-1 §4.4 step 1), over the frozen requests: (i) the
 * canonical template, (ii) the frozen phone's own key, (iii) its body bytes.
 * Answers the problems and, when there are none, the signer.
 */
function signingProofs(w, v) {
  const problems = [];
  const requests = Array.isArray(v?.requests) ? v.requests : [];
  if (requests.length === 0) return { problems: ['proof (i): the frozen vectors hold no request, so the way the frozen phone signs cannot be proved'], sign: null, lead: null };
  const lead = String(requests[0].canonical ?? '').split('\n')[0];
  const binding = v.identity?.binding;
  const canonicalOf = (r) => [lead, String(r.method).toUpperCase(), r.target, sha256hex(Buffer.from(String(r.body ?? ''), 'utf8')), r.timestamp, r.nonce, binding].join('\n');
  for (const r of requests) {
    if (String(r.canonical ?? '').split('\n')[0] !== lead) problems.push(`proof (i): request ${String(r.name)}'s canonical text does not begin ${JSON.stringify(lead)} as every other frozen one does`);
    else if (canonicalOf(r) !== r.canonical) problems.push(`proof (i): the frozen phone's canonical template does not re-derive request ${String(r.name)}'s canonical text, so no other way it asks can be signed as it signs`);
  }
  let key = null;
  try {
    const seed = Buffer.from(String(v.keys?.phoneSigningSeed ?? ''), 'hex');
    key = createPrivateKey({ key: Buffer.concat([Buffer.from(PKCS8.ed25519, 'hex'), seed]), format: 'der', type: 'pkcs8' });
    const spki = createPublicKey(key).export({ type: 'spki', format: 'der' }).toString('base64url');
    if (spki !== v.keys?.phoneSigningKey) problems.push("proof (ii): the frozen phoneSigningSeed is not the private half of the frozen phoneSigningKey");
  } catch (err) {
    problems.push(`proof (ii): the frozen phoneSigningSeed is not an Ed25519 seed: ${String(err?.message ?? err)}`);
    key = null;
  }
  const sign = key === null ? null : (text) => signWith(null, Buffer.from(text, 'utf8'), key).toString('base64url');
  if (sign !== null) {
    for (const r of requests) if (sign(String(r.canonical ?? '')) !== r.signature) problems.push(`proof (ii): re-signing request ${String(r.name)} with the frozen phone's seed does not give its frozen signature`);
  }
  const writes = new Set((w.routes ?? []).filter((x) => x.reads === false).map((x) => `${x.method} ${x.path}`));
  let bodies = 0;
  for (const r of requests) {
    if (!writes.has(`${String(r.method).toUpperCase()} ${requestPath(r)}`)) continue;
    bodies += 1;
    let again = null;
    try {
      again = swiftJson(JSON.parse(String(r.body ?? '')));
    } catch {
      again = null;
    }
    if (again !== r.body) problems.push(`proof (iii): the serializer does not write request ${String(r.name)}'s frozen body back byte for byte${again === null ? ' (it is not JSON)' : ''}`);
  }
  if (bodies === 0 && writes.size > 0) problems.push('proof (iii): the frozen vectors hold no write body to prove the serializer on');
  return { problems, sign: problems.length === 0 ? sign : null, canonicalOf };
}

/** What a generated request carries so R2 can read it back: `asked` (sessions), `page` (scrollback). */
function readBackOf(route, target) {
  const at = target.indexOf('?');
  const q = new URLSearchParams(at === -1 ? '' : target.slice(at + 1));
  if (route === 'sessions') return { asked: { show: q.get('show'), group: q.get('group'), sort: q.get('sort'), agent: q.get('agent'), machine: q.get('machine') } };
  if (route === 'scrollback') {
    const num = (n) => (q.get(n) === null ? null : Number(q.get(n)));
    return { page: { id: q.get('id'), from: num('from'), count: num('count'), depth: num('depth'), wrap: num('wrap'), keep: q.get('keep') } };
  }
  return {};
}

const replayCache = new Map();
/**
 * EVERY REQUEST THE FROZEN PHONE CAN MAKE (SPEC-1 §4.4), once per set,
 * deterministic: `{ frozen, generated, problems, notes }`. The proofs run
 * first; any that fails is R2 red by name and nothing is generated. Every
 * unoccupied point of each route's cross product is one generated request,
 * named `variant:<route>:<index>` by its position in the product (the first
 * dimension of the record varying slowest), signed with the frozen phone's
 * seed over its canonical template, its nonce `sha256("p33311.1|<route>|<index>")`.
 */
function replaysOf(set) {
  if (replayCache.has(set)) return replayCache.get(set);
  const w = set.wire;
  const v = set.vectors;
  const out = { frozen: Array.isArray(v?.requests) ? v.requests : [], generated: [], problems: [], notes: [] };
  replayCache.set(set, out);
  const proofs = signingProofs(w, v);
  if (proofs.problems.length > 0) {
    out.problems.push(...proofs.problems);
    return out;
  }
  if (!Array.isArray(w.requests)) {
    out.notes.push(`${set.name}: no request record, so only its frozen requests replay (F3 names the missing record)`);
    return out;
  }
  const wordsOf = (e) => (w.sends ?? []).find((s) => s.phone === e)?.words ?? null;
  const plans = [];
  let total = out.frozen.length;
  for (const rec of w.requests) {
    if (recordShapeProblem(rec) !== null || typeof rec.route !== 'string') continue; // F3 names it
    const plan = planOf(rec, out.frozen, wordsOf);
    if (plan.opaque || plan.base === null || plan.problems.length > 0) continue; // R3 owns /pair; F3 names a plan's problems
    const occupied = new Set();
    for (const { values } of plan.parsed) {
      const at = pointOf(plan, values);
      if (at !== null) occupied.add(at);
    }
    plans.push({ plan, occupied });
    total += waysOf(plan) - occupied.size;
  }
  if (total > REPLAY_CEILING) {
    out.problems.push(`the cross product of ${String(w.label ?? set.name)} is ${String(total)} requests, over the ceiling of ${String(REPLAY_CEILING)} measured to keep the gate inside its 3 s budget (build/p33311/SPEC-1.md §2.3): raise it with a measurement, never sample`);
    return out;
  }
  for (const { plan, occupied } of plans) {
    const { rec, base, dims, items, isGet } = plan;
    const ways = waysOf(plan);
    for (let index = 0; index < ways; index += 1) {
      if (occupied.has(index)) continue;
      const chosen = new Map();
      let rest = index;
      for (let d = dims.length - 1; d >= 0; d -= 1) {
        chosen.set(dims[d].name, dims[d].choices[rest % dims[d].choices.length]);
        rest = Math.floor(rest / dims[d].choices.length);
      }
      let target = rec.path;
      let body = String(base.r.body ?? '');
      if (isGet) {
        const pairs = [];
        for (const it of items) {
          const value = chosen.has(it.name) ? chosen.get(it.name) : base.values.get(it.name);
          if (value === ABSENT || value === undefined) continue;
          pairs.push(`${it.name}=${String(value)}`);
        }
        if (pairs.length > 0) target = `${rec.path}?${pairs.join('&')}`;
      } else {
        const object = Object.fromEntries(base.values);
        for (const [name, value] of chosen) {
          if (value === ABSENT) delete object[name];
          else object[name] = value;
        }
        body = swiftJson(object);
      }
      const r = {
        name: `variant:${rec.route}:${String(index)}`,
        method: rec.method,
        target,
        id: base.r.id ?? null,
        body,
        bodySha256: sha256hex(Buffer.from(body, 'utf8')),
        timestamp: base.r.timestamp,
        nonce: sha256hex(`p33311.1|${rec.route}|${String(index)}`).slice(0, 32),
        generated: true,
        ...readBackOf(rec.route, target)
      };
      r.canonical = proofs.canonicalOf(r);
      r.signature = proofs.sign(r.canonical);
      out.generated.push(r);
    }
  }
  return out;
}

/**
 * F3's half for the request record and the asks (SPEC-1 §4.3): the record
 * holds together, agrees with the frozen vectors, and every way it asks can
 * be replayed.
 */
function clauseF3Record(set) {
  const w = set.wire;
  const name = set.name;
  checked('F3');
  if (!Array.isArray(w.asks)) fail('F3', `${name}: it holds no asks (the numbers the phone's own Swift asks of the Mac), which format 2 seals`);
  else {
    const phones = new Set();
    for (const row of w.asks) {
      checked('F3');
      const ok = isPlainObject(row) && typeof row.phone === 'string' && row.phone !== '' && typeof row.value === 'number' && Number.isFinite(row.value) && row.value >= 0 && typeof row.mac === 'string' && row.mac !== '' && typeof row.macFile === 'string' && row.macFile !== '' && ASK_RULES.includes(row.rule);
      if (!ok) fail('F3', `${name}: the ask ${shortJson(row)} is not { phone, value >= 0, mac, macFile, rule } with rule ${ASK_RULES.join(' or ')}`);
      else if (phones.has(row.phone)) fail('F3', `${name}: the ask ${row.phone} is sealed twice`);
      if (isPlainObject(row)) phones.add(row.phone);
    }
  }
  checked('F3');
  if (!Array.isArray(w.requests)) {
    fail('F3', `${name}: it holds no request record (requests), so the ways the launch phone asks cannot be replayed: format 2 seals one`);
    return;
  }
  const sends = Array.isArray(w.sends) ? w.sends : [];
  const wordsOf = (e) => sends.find((s) => s.phone === e)?.words ?? null;
  const records = [];
  for (const rec of w.requests) {
    checked('F3');
    const why = recordShapeProblem(rec);
    if (why !== null) {
      fail('F3', `${name}: a request record ${shortJson(rec)}: ${why}`);
      continue;
    }
    const route = (w.routes ?? []).find((r) => r.method === rec.method && r.path === rec.path);
    if (route === undefined) fail('F3', `${name}: the request record for ${rec.method} ${rec.path} names no frozen route`);
    else if (rec.route !== route.id) fail('F3', `${name}: the request record for ${rec.method} ${rec.path} names route ${shortJson(rec.route)}, and the frozen route there is ${route.id}`);
    records.push(rec);
  }
  for (const route of w.routes ?? []) {
    checked('F3');
    const n = w.requests.filter((rec) => isPlainObject(rec) && rec.method === route.method && rec.path === route.path).length;
    if (n !== 1) fail('F3', `${name}: route ${String(route.id)} (${route.method} ${route.path}) has ${String(n)} request record(s), not exactly one`);
  }
  // Words: every set a record names is a sends row, every sends row is used,
  // and a word sent in a query is RFC 3986 unreserved, so the phone's
  // queryValue writes it as it is.
  const used = new Set();
  for (const rec of records) {
    for (const item of [...rec.query, ...(Array.isArray(rec.body?.fields) ? rec.body.fields : [])]) {
      for (const e of wordSetsIn(item.value)) {
        used.add(e);
        checked('F3');
        const words = wordsOf(e);
        if (words === null || !Array.isArray(words)) {
          fail('F3', `${name}: ${rec.method} ${rec.path}'s ${item.name} is drawn from ${e}, which no sends row holds`);
          continue;
        }
        if (rec.query.includes(item)) {
          const reserved = words.filter((x) => typeof x !== 'string' || !/^[A-Za-z0-9._~-]+$/.test(x));
          if (reserved.length > 0) fail('F3', `${name}: ${e}'s ${reserved.map((x) => JSON.stringify(x)).join(', ')} would be percent-encoded in a query, and a word the phone sends is spelled as it is`);
        }
      }
    }
  }
  for (const row of sends) {
    checked('F3');
    if (!used.has(row.phone)) fail('F3', `${name}: the sends row ${String(row.phone)} is used by no request record`);
  }
  // Every frozen request on a recorded route conforms to its record, and
  // every way the record asks can be built from the frozen requests.
  const requests = Array.isArray(set.vectors?.requests) ? set.vectors.requests : [];
  for (const rec of records) {
    const plan = planOf(rec, requests, wordsOf);
    if (plan.opaque) continue; // /pair: R3 opens the presentation
    for (const r of plan.onRoute) {
      checked('F3');
      for (const f of conformRequest(rec, r, wordsOf)) fail('F3', `${name}: ${f}, so the record and the frozen phone's own requests disagree`);
    }
    checked('F3');
    for (const p of plan.problems) fail('F3', `${name}: ${p}`);
  }
}

// ---------------------------------------------------------------------------
// The committed copies (Phase 333.11.1, SPEC-1 D9, §4.2), and what the Mac holds
// ---------------------------------------------------------------------------

/**
 * Every Mac-side row `next` holds lower, shorter, missing, re-ruled or moved
 * against `previous` (SPEC-1 §4.8, widened by the fix round): a `macLimits`
 * row by `mac` (its value, and the file it is read from), a bound by `phone`
 * (its Mac list, the rule it holds the Mac by, the file its constants are
 * read from, its value, its least value and the paths it bounds), an ask by
 * `phone` (its value, its Mac constant, its rule and its file). One function,
 * used by F1 (b) against every committed copy and by `--replace` against the
 * set it replaces. A file may move only to the one the gate's own tables
 * name, which is a refactor that moved a constant; any other move points the
 * row at a file the gate does not vouch for (the reverify's W21 and W22). A
 * rule a frozen set held the Mac by is never changed (the reverify's W20:
 * `mac<=phone` resealed as `instance<=phone` took the Mac out of A4).
 */
function macSideLosses(previous, next) {
  const out = [];
  const rows = (x, key) => (Array.isArray(x?.[key]) ? x[key].filter(isPlainObject) : []);
  const moved = (was, now, own) => typeof was === 'string' && now !== was && now !== own;
  for (const row of rows(previous, 'macLimits')) {
    if (typeof row.mac !== 'string') continue;
    const now = rows(next, 'macLimits').find((r) => r.mac === row.mac);
    if (now === undefined) {
      out.push(`${row.mac} (${String(row.value)}) is missing from its Mac limits`);
      continue;
    }
    if (typeof row.value === 'number' && !(typeof now.value === 'number' && now.value >= row.value)) out.push(`${row.mac} is ${String(now.value)}, lower than the ${String(row.value)} it held`);
    if (moved(row.file, now.file, gateFileOf(row.mac))) out.push(`${row.mac} is read from ${String(now.file)}, not the ${row.file} it was held in, and the gate's own tables name ${gateFileOf(row.mac) ?? 'no file'} for it`);
  }
  for (const row of rows(previous, 'bounds')) {
    if (typeof row.phone !== 'string') continue;
    const list = Array.isArray(row.mac) ? row.mac : [];
    const now = rows(next, 'bounds').find((r) => r.phone === row.phone);
    if (now === undefined) {
      out.push(`the bound ${row.phone}${list.length > 0 ? `, which held ${list.join(', ')} to the phone,` : ''} is missing`);
      continue;
    }
    if (MAC_HELD_RULES.includes(row.rule) && now.rule !== row.rule) out.push(`${row.phone} is held by ${String(now.rule)}, where it held the Mac by ${row.rule}`);
    const lost = list.filter((m) => !(Array.isArray(now.mac) && now.mac.includes(m)));
    if (lost.length > 0) out.push(`${row.phone}'s Mac list is shorter: it no longer names ${lost.join(', ')}`);
    const own = reader.BOUND_ROWS.find((b) => b.phone === row.phone);
    if (list.length > 0 && moved(row.macFile, now.macFile, own?.macFile ?? null)) out.push(`${row.phone}'s Mac constants are read from ${String(now.macFile)}, not the ${String(row.macFile)} they were held in, and the reader's own BOUND_ROWS name ${own?.macFile ?? 'no file'} for them`);
    const looser = boundLooser(row, now);
    if (looser !== null) out.push(`${row.phone} ${looser}`);
    if (typeof row.min === 'number' && !(typeof now.min === 'number' && now.min >= row.min)) out.push(`${row.phone}'s least value is ${String(now.min)}, below the ${String(row.min)} the frozen phone holds`);
    const unbounded = (Array.isArray(row.applies) ? row.applies : []).filter((a) => !(Array.isArray(now.applies) && now.applies.includes(a)));
    if (unbounded.length > 0) out.push(`${row.phone} no longer bounds ${unbounded.join(', ')}`);
  }
  for (const row of rows(previous, 'asks')) {
    if (typeof row.phone !== 'string') continue;
    const now = rows(next, 'asks').find((r) => r.phone === row.phone);
    if (now === undefined) {
      out.push(`the ask ${row.phone} (${String(row.value)}, held against ${String(row.mac)}) is missing`);
      continue;
    }
    if (typeof row.value === 'number' && !(typeof now.value === 'number' && now.value >= row.value)) out.push(`the ask ${row.phone} is ${String(now.value)}, lower than the ${String(row.value)} it held`);
    if (now.mac !== row.mac) out.push(`the ask ${row.phone} is held against ${String(now.mac)}, where it held ${String(row.mac)}`);
    if (now.rule !== row.rule) out.push(`the ask ${row.phone} holds the Mac by ${String(now.rule)}, where it held it by ${String(row.rule)}`);
    if (moved(row.macFile, now.macFile, gateFileOf(row.mac))) out.push(`the ask ${row.phone}'s ${String(row.mac)} is read from ${String(now.macFile)}, not the ${row.macFile} it was held in, and the gate's own tables name ${gateFileOf(row.mac) ?? 'no file'} for it`);
  }
  return out;
}

/**
 * How a bound `now` holds the Mac less than `was` did, or null: an upper
 * bound (`mac<=phone`, `mac<phone*1000`, `instance<=phone`) raised, an
 * `equal` value changed, or a `mac-in-phone` list grown by a value the frozen
 * phone does not take. Read by `was`'s rule, so a rule changed as well is
 * judged by the rule the frozen phone held.
 */
function boundLooser(was, now) {
  const p = was.value;
  const n = now.value;
  if (was.rule === 'equal') return reader.canonical(p) === reader.canonical(n) ? null : `is ${JSON.stringify(n)}, not the ${JSON.stringify(p)} the frozen phone reads`;
  if (was.rule === 'mac-in-phone') {
    if (!Array.isArray(p)) return null;
    if (!Array.isArray(n)) return `is ${JSON.stringify(n)}, not a list inside ${JSON.stringify(p)}`;
    const extra = n.filter((x) => !p.some((y) => reader.canonical(y) === reader.canonical(x)));
    return extra.length > 0 ? `now admits ${JSON.stringify(extra)}, which the frozen phone does not take` : null;
  }
  if (typeof p !== 'number') return null;
  return typeof n === 'number' && n <= p ? null : `is ${String(n)}, above the ${String(p)} the frozen phone holds the Mac to`;
}

/**
 * Every way of asking `next` no longer records against `previous` (the fix
 * round, the reverify's W16): a route the frozen phone calls, a request
 * record, a query name or body key, a name sent only sometimes now recorded
 * as always, a key that may be null now never, a value drawn from a closed
 * set, a Bool or a key list recorded with another shape, and a word a closed
 * set the phone sends held. R2 and R5 replay what the SEALED record and
 * `sends` hold, so a record resealed with a way of asking taken out replays
 * nothing for it, and P0's same-bytes rule holds it only while every phone
 * file is unchanged. Used by F1 (b) and by `--replace`, as macSideLosses is.
 * Given the two sets' vectors (Phase 333.11.2, SPEC-2 D7), it also asks
 * vectorLosses, so every request the frozen phone was recorded sending stays
 * by name, method, target and body; a `nextVectors` of null loses them all.
 */
function requestLosses(previous, next, previousVectors = null, nextVectors = null) {
  const out = [];
  const rows = (x, key) => (Array.isArray(x?.[key]) ? x[key].filter(isPlainObject) : []);
  const keyOf = (r) => `${String(r.method).toUpperCase()} ${String(r.path)}`;
  for (const r of rows(previous, 'routes')) {
    if (!rows(next, 'routes').some((x) => keyOf(x) === keyOf(r))) out.push(`${keyOf(r)}, a route the frozen phone calls, is gone`);
  }
  const replayed = (v) => v === 'bool' || (isPlainObject(v) && (typeof v.words === 'string' || replayed(v.array) || (Array.isArray(v.oneOf) && v.oneOf.some((a) => replayed(a?.value)))));
  const compare = (where, was, now) => {
    if (!isPlainObject(now)) {
      out.push(`${where} is no longer recorded`);
      return;
    }
    if (was.sent === 'sometimes' && now.sent !== 'sometimes') out.push(`${where} is recorded as sent ${String(now.sent)}, where the frozen phone sends it only sometimes: the request without it is no longer replayed`);
    if (was.null === true && now.null !== true) out.push(`${where} is recorded as never null, where the frozen phone sends null`);
    if (replayed(was.value) && reader.canonical(was.value) !== reader.canonical(now.value)) out.push(`${where} is recorded as ${shortJson(now.value)}, where the frozen phone draws it from ${shortJson(was.value)}`);
  };
  const byName = (list, name) => (Array.isArray(list) ? list.find((x) => isPlainObject(x) && x.name === name) : undefined);
  for (const rec of rows(previous, 'requests')) {
    const now = rows(next, 'requests').find((x) => keyOf(x) === keyOf(rec));
    if (now === undefined) {
      out.push(`the request record of ${keyOf(rec)} is gone`);
      continue;
    }
    for (const item of (Array.isArray(rec.query) ? rec.query : []).filter(isPlainObject)) compare(`${keyOf(rec)}'s query name ${String(item.name)}`, item, byName(now.query, item.name));
    if (isPlainObject(rec.body) && rec.body.opaque !== undefined && now.body?.opaque !== rec.body.opaque) out.push(`${keyOf(rec)}'s body is recorded as ${shortJson(now.body)}, where the frozen phone sends ${shortJson(rec.body)}`);
    for (const field of (Array.isArray(rec.body?.fields) ? rec.body.fields : []).filter(isPlainObject)) compare(`${keyOf(rec)}'s body key ${String(field.name)}`, field, byName(now.body?.fields, field.name));
  }
  for (const s of rows(previous, 'sends')) {
    const now = rows(next, 'sends').find((x) => x.phone === s.phone);
    if (now === undefined) {
      out.push(`${String(s.phone)}, the words the frozen phone sends, is gone`);
      continue;
    }
    const lost = (Array.isArray(s.words) ? s.words : []).filter((w) => !(Array.isArray(now.words) && now.words.includes(w)));
    if (lost.length > 0) out.push(`${String(s.phone)} no longer holds ${lost.join(', ')}, which the frozen phone sends`);
  }
  if (previousVectors !== null) out.push(...vectorLosses(previousVectors, nextVectors));
  return out;
}

/**
 * Every request `previousVectors` records that `nextVectors` no longer holds
 * the same (Phase 333.11.2, SPEC-2 D7): for each request with a string
 * `name`, the next vectors must hold one with that name whose `method`,
 * `target` and `body` are the same strings. R2 replays the requests the
 * WORKING vectors hold, so a frozen request taken out of them and resealed
 * replayed nothing for itself, and a request whose body was reordered,
 * retargeted or re-cased replayed the edited one. `id`, `timestamp`,
 * `nonce`, `canonical` and `signature` are not compared: they are the
 * signing, which R2's proof (iii) holds. Used by F1 (b) through
 * requestLosses, and by `--replace` through the same call.
 */
function vectorLosses(previousVectors, nextVectors) {
  const out = [];
  const requests = (v) => (isPlainObject(v) && Array.isArray(v.requests) ? v.requests.filter(isPlainObject) : []);
  // A body's length and the head of its sha256, so a body reordered to the
  // same length still reads as two different bodies in the sentence.
  const bytesOf = (body) => (typeof body === 'string' ? `${String(Buffer.byteLength(body, 'utf8'))} bytes (sha256 ${sha256hex(Buffer.from(body, 'utf8')).slice(0, 8)})` : `no string (${shortJson(body)})`);
  const now = requests(nextVectors);
  for (const was of requests(previousVectors)) {
    if (typeof was.name !== 'string') continue;
    const named = now.filter((r) => r.name === was.name);
    if (named.length === 0) {
      out.push(`the frozen request ${was.name} (${String(was.method)} ${String(was.target).slice(0, 60)}) is gone from its vectors`);
      continue;
    }
    if (named.some((r) => r.method === was.method && r.target === was.target && r.body === was.body)) continue;
    const is = named[0];
    const moved = ['method', 'target', 'body'].filter((k) => is[k] !== was[k]);
    out.push(
      `the frozen request ${was.name} is ${String(is.method)} ${String(is.target).slice(0, 60)} with a body of ${bytesOf(is.body)}, where the frozen phone sent ${String(was.method)} ${String(was.target).slice(0, 60)} with ${bytesOf(was.body)} (its ${moved.join(' and ')} moved)`
    );
  }
  return out;
}

/**
 * `git`'s environment (SPEC-1 §4.2): no optional locks, no prompt, none of
 * the variables a git hook hands a build (they would point it at another
 * repository), and no global or system configuration, so the gate reads
 * nothing under the person's home and a configured colour, pager or
 * signature line cannot reach what it parses. Since Phase 333.11.2 (SPEC-2
 * §3.2) every pathspec is literal, every call passes `-c
 * core.quotePath=false` so a path comes back as its bytes, and a partial
 * clone never fetches a blob it lacks (GIT_NO_LAZY_FETCH, which git reads
 * from 2.44): the gate opens no socket, so a blob that is not there is a
 * note ("<oid> missing"), never a download.
 */
const GIT_ENV = (() => {
  const env = {
    ...process.env,
    GIT_OPTIONAL_LOCKS: '0',
    GIT_TERMINAL_PROMPT: '0',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_LITERAL_PATHSPECS: '1',
    GIT_NO_LAZY_FETCH: '1'
  };
  for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[k];
  return env;
})();
const gitStats = { copies: 0, labels: 0, notes: 0 };
/**
 * One read-only git command in ROOT: `{ ok, out }` or `{ ok: false, why }`.
 * `input` is written to its standard input, and `bytes` answers `out` as a
 * Buffer: `cat-file --batch`'s answer is read as bytes, because the vectors
 * hold non-ASCII and a decoded string's length is not the size git names.
 */
function git(args, { input = null, bytes = false } = {}) {
  const run = spawnSync('git', ['-c', 'core.quotePath=false', '-C', ROOT, ...args], {
    ...(bytes ? {} : { encoding: 'utf8' }),
    input: input ?? undefined,
    timeout: 10_000,
    maxBuffer: 256 * 1024 * 1024,
    env: GIT_ENV
  });
  if (run.error !== undefined) return { ok: false, why: run.error.code === 'ENOENT' ? 'git is not on PATH' : `git ${args[0]} could not run (${String(run.error.code ?? run.error.message)})` };
  if (run.status !== 0) return { ok: false, why: `git ${args[0]} exited ${String(run.status)}${String(run.stderr ?? '').trim() === '' ? '' : ` (${String(run.stderr).trim().split('\n')[0].slice(0, 120)})`}` };
  return { ok: true, out: bytes ? run.stdout : String(run.stdout ?? '') };
}
const gitNote = (msg) => {
  note('F1', msg);
  gitStats.notes += 1;
};
const COMMIT_LINE = /^[0-9a-f]{40}([0-9a-f]{24})?$/;
/** A path directly under the frozen directory `dir` (no deeper), as git prints it. */
const directlyUnder = (dir, path) => path.startsWith(`${dir}/`) && !path.slice(dir.length + 1).includes('/');
/** The route ledger, relative to the judged tree's top (R8, Phase 333.12). */
const LEDGER_REL = 'src/main/pocket/route-ledger.ts';

/**
 * THE COMMITTED HISTORY, read once a run for F1 and R8 (Phase 333.11.2,
 * SPEC-2 §3.2; R8, Phase 333.12's route ledger, reads its committed copies
 * from these same reads rather than its own), in four read-only reads:
 * `rev-parse`; ONE `log --raw --root` over the frozen directory's and the
 * ledger's whole history (every `*.wire.json` blob a commit added or changed
 * directly under the frozen directory is a committed copy, every other
 * `*.json` blob there a vectors candidate, and every blob of the ledger's
 * path a committed ledger, each with the newest commit naming it); `ls-tree
 * HEAD` over both (the wire blobs at HEAD, for F1 (a), and a blob only a
 * merge made); and ONE `cat-file --batch` for every distinct blob, read as
 * bytes. A frozen directory outside the judged tree leaves it out of the
 * reads, and the ledger is still read. Answers `{ why }` when the history
 * cannot be read at all, else the blobs, with each note kept for the clause
 * it concerns (`notes.f1`, `notes.r8`): each clause says the environment in
 * its own words, and never red.
 */
let historyRead = null;
function committedHistory() {
  if (historyRead === null) historyRead = readHistory();
  return historyRead;
}
function readHistory() {
  const dirRel = relative(ROOT, FROZEN_DIR);
  const dir = dirRel === '' || dirRel.startsWith('..') || isAbsolute(dirRel) ? null : dirRel.split(sep).join('/');
  const top = git(['rev-parse', '--show-prefix', '--is-shallow-repository']);
  if (!top.ok) return { dir, why: top.why };
  const [prefix = '', shallow = ''] = top.out.split('\n');
  if (prefix.trim() !== '') return { dir, why: `the judged tree is ${prefix.trim()} inside its repository, not its top level` };
  const notes = { f1: [], r8: [] };
  const log = git(['log', '--format=%H', '--raw', '--no-abbrev', '--no-renames', '--root', '--', ...(dir === null ? [] : [dir]), LEDGER_REL]);
  if (!log.ok) return { dir, why: log.why };
  /** wire blob → the newest commit naming it, and its path there. */
  const wires = new Map();
  const candidates = new Set();
  /** ledger blob → the newest commit naming it. */
  const ledger = new Map();
  let commit = null;
  for (const line of log.out.split('\n')) {
    if (COMMIT_LINE.test(line)) {
      commit = line;
      continue;
    }
    const tab = line.indexOf('\t');
    if (!line.startsWith(':') || tab === -1 || commit === null) continue;
    const [, mode = '', , blob = '', status = ''] = line.slice(1, tab).split(' ');
    const path = line.slice(tab + 1);
    // A deletion names no blob to read, so it is skipped before its path is.
    if (!['A', 'M', 'T'].includes(status)) continue;
    // The ledger's path holds nothing git quotes, so a quoted path is under
    // the frozen directory.
    if (path.startsWith('"')) {
      notes.f1.push(`git quoted the path ${path.slice(0, 80)} committed at ${commit.slice(0, 8)}, so it was not read`);
      continue;
    }
    const isLedger = path === LEDGER_REL;
    if (!isLedger && (dir === null || !directlyUnder(dir, path) || !path.endsWith('.json'))) continue;
    if (mode !== '100644' && mode !== '100755') {
      (isLedger ? notes.r8 : notes.f1).push(`${path} committed at ${commit.slice(0, 8)} is not a file (mode ${mode}), so it was not read`);
      continue;
    }
    if (isLedger) {
      if (!ledger.has(blob)) ledger.set(blob, { commit, path });
    } else if (!path.endsWith('.wire.json')) candidates.add(blob);
    else if (!wires.has(blob)) wires.set(blob, { commit, path });
  }
  const headBlobs = new Set();
  const tree = git(['ls-tree', 'HEAD', '--', ...(dir === null ? [] : [`${dir}/`]), LEDGER_REL]);
  const headRead = tree.ok;
  if (tree.ok) {
    for (const line of tree.out.split('\n')) {
      const tab = line.indexOf('\t');
      if (tab === -1) continue;
      const [, type = '', oid = ''] = line.slice(0, tab).split(' ');
      const path = line.slice(tab + 1);
      if (type !== 'blob') continue;
      // A blob only a merge made is in no commit's own diff (SPEC-2 §10).
      if (path === LEDGER_REL) {
        if (!ledger.has(oid)) ledger.set(oid, { commit: 'HEAD', path });
        continue;
      }
      if (dir === null || !directlyUnder(dir, path) || !path.endsWith('.wire.json')) continue;
      headBlobs.add(oid);
      if (!wires.has(oid)) wires.set(oid, { commit: 'HEAD', path });
    }
  }
  const f1Wanted = new Set([...wires.keys(), ...candidates]);
  const wanted = [...new Set([...f1Wanted, ...ledger.keys()])];
  /** Where a note about the blob `oid` belongs: the clause that asked for it, or (unknown) every clause that asked for any. */
  const notesFor = (oid) => {
    const mine = [...(f1Wanted.has(oid) ? [notes.f1] : []), ...(ledger.has(oid) ? [notes.r8] : [])];
    return mine.length > 0 ? mine : [...(f1Wanted.size > 0 ? [notes.f1] : []), ...(ledger.size > 0 ? [notes.r8] : [])];
  };
  const blobs = new Map();
  if (wanted.length > 0) {
    const cat = git(['cat-file', '--batch'], { input: `${wanted.join('\n')}\n`, bytes: true });
    if (!cat.ok) return { dir, why: cat.why };
    const buf = cat.out;
    let at = 0;
    while (at < buf.length) {
      const nl = buf.indexOf(0x0a, at);
      if (nl === -1) break;
      const header = buf.subarray(at, nl).toString('utf8');
      at = nl + 1;
      const parts = header.split(' ');
      if (parts.length !== 3) {
        for (const n of notesFor(parts[0])) n.push(`git cat-file answered ${header.slice(0, 80)}, so that blob was not read`);
        continue;
      }
      const size = Number(parts[2]);
      if (!Number.isSafeInteger(size) || size < 0 || at + size > buf.length) {
        for (const n of notesFor(null)) n.push(`git cat-file answered a size it did not send (${header.slice(0, 80)}), so nothing after it was read`);
        break;
      }
      blobs.set(parts[0], buf.subarray(at, at + size));
      at += size + 1;
    }
  }
  return { dir, why: null, shallow: shallow.trim() === 'true', notes, wires, candidates, headBlobs, headRead, headWhy: tree.ok ? null : tree.why, ledger, blobs };
}

/**
 * Every copy ever committed directly under the frozen directory, by LABEL
 * (Phase 333.11.2, SPEC-2 §3.2 and §3.3), from the committed history above.
 * A copy's vectors are the candidate whose sha256 is its own
 * `vectors.sha256` (SPEC-2 D6), so a renamed vectors file and a shallow
 * graft change nothing. Answers `null` when nothing could be compared (a note
 * says why), else `{ dir, byLabel, headRead }`, `byLabel` mapping each label
 * to its copies newest first.
 */
function committedCopies() {
  const h = committedHistory();
  if (h.dir === null) {
    gitNote(`the frozen directory ${FROZEN_DIR} is not under the judged tree, so its committed copies were not compared`);
    return null;
  }
  if (h.why !== null) {
    gitNote(`${h.why}: committed copies not compared`);
    return null;
  }
  const { dir, wires, candidates, headBlobs, headRead, blobs } = h;
  if (h.shallow) gitNote('a shallow clone: only the copies after its graft');
  for (const n of h.notes.f1) gitNote(n);
  if (!headRead) gitNote(`${h.headWhy}: no HEAD to read, so (a) was not compared`);
  const vectorsBySha = new Map();
  for (const blob of candidates) {
    const bytes = blobs.get(blob);
    if (bytes !== undefined) vectorsBySha.set(sha256hex(bytes), bytes);
  }
  const byLabel = new Map();
  for (const [blob, where] of wires) {
    const bytes = blobs.get(blob);
    if (bytes === undefined) continue;
    let copy;
    try {
      copy = JSON.parse(bytes.toString('utf8'));
    } catch {
      copy = undefined;
    }
    if (!isPlainObject(copy) || typeof copy.label !== 'string') {
      gitNote(`${where.path} committed at ${where.commit.slice(0, 8)} ${isPlainObject(copy) ? 'holds no string label' : 'is not a JSON object'}, so it was not compared`);
      continue;
    }
    const vectorsBytes = typeof copy.vectors?.sha256 === 'string' ? vectorsBySha.get(copy.vectors.sha256) : undefined;
    let vectors = null;
    if (vectorsBytes === undefined) gitNote(`${copy.label}'s copy committed at ${where.commit.slice(0, 8)} as ${where.path}: its vectors were never committed under ${dir}, so its requests were not compared`);
    else {
      try {
        const parsed = JSON.parse(vectorsBytes.toString('utf8'));
        vectors = isPlainObject(parsed) ? parsed : null;
      } catch {
        vectors = null;
      }
      if (vectors === null) gitNote(`${copy.label}'s copy committed at ${where.commit.slice(0, 8)} as ${where.path}: its vectors are not a JSON object, so its requests were not compared`);
    }
    if (!byLabel.has(copy.label)) byLabel.set(copy.label, []);
    byLabel.get(copy.label).push({ commit: where.commit, path: where.path, wire: copy, vectors, head: headBlobs.has(blob) });
  }
  return { dir, byLabel, headRead };
}

/**
 * F1 against the committed copies (SPEC-1 D9, §4.2; by label since Phase
 * 333.11.2, SPEC-2 §3.4). Every environmental failure (no git, not a
 * repository, ROOT inside one, the frozen directory outside ROOT, a shallow
 * clone, no HEAD, a copy that is not JSON or has no label, a copy whose
 * vectors were never committed, a path git quoted) is a NOTE naming what was
 * not compared; only a finding is red. A SET IS ITS LABEL, NOT ITS FILE: (c)
 * every label any committed copy holds is held by a working set or named in
 * RETIRED_SETS, so a set renamed, relabelled or deleted is still compared or
 * red; (a) a set whose seal differs from a copy of its label at HEAD must
 * continue that copy's history with that copy's seal, or it was edited and
 * resealed by hand; (b) no Mac-side row lower, shorter, missing, re-ruled or
 * moved, no way the frozen phone asks taken out, and no request the copy's
 * vectors hold gone or changed, against ANY copy of its label
 * (macSideLosses and requestLosses, the two `--replace` asks too).
 */
function clauseF1Copies(sets) {
  const working = sets.filter((s) => isPlainObject(s.wire) && typeof s.wire.label === 'string');
  const found = committedCopies();
  if (found === null) return;
  const { dir, byLabel, headRead } = found;
  gitStats.labels = byLabel.size;
  if (byLabel.size > 0) expects('F1');
  const held = new Set(working.map((s) => s.wire.label));
  // (c) No committed label gone, unless retired by ruling.
  for (const [label, copies] of byLabel) {
    if (held.has(label)) continue;
    checked('F1');
    if (Object.hasOwn(RETIRED_SETS, label)) continue;
    fail('F1', `${label}, frozen at ${copies[0].commit.slice(0, 8)} as ${copies[0].path}, is not in ${dir}: a frozen set is retired only on his word, in one commit that removes its two files, names its label in RETIRED_SETS and lowers FROZEN_SETS_FLOOR; renamed or relabelled, it is still that set`);
  }
  for (const set of working) {
    const label = set.wire.label;
    const copies = byLabel.get(label) ?? [];
    if (copies.length === 0) {
      gitNote(`${set.name}: no committed copy (a new or untracked set), so there is nothing to compare it with`);
      continue;
    }
    const as = (copy) => (copy.path.endsWith(`/${set.name}`) ? '' : ` as ${copy.path}`);
    // (a) No hand edit since the commit, against every copy of its label at HEAD.
    if (headRead) {
      for (const copy of copies.filter((c) => c.head)) {
        checked('F1');
        if (copy.wire.seal === set.wire.seal) continue;
        const theirs = Array.isArray(copy.wire.history) ? copy.wire.history : [];
        const mine = Array.isArray(set.wire.history) ? set.wire.history : [];
        const continues = mine.length > theirs.length && theirs.every((e, i) => reader.canonical(e) === reader.canonical(mine[i])) && mine[theirs.length]?.seal === copy.wire.seal;
        if (!continues) fail('F1', `${label} differs from the copy committed at HEAD${as(copy)} (${String(copy.wire.seal).slice(0, 8)}) and its history does not continue that copy's: it was edited and resealed by hand, not replaced with --freeze --replace --why`);
      }
    }
    // (b) Never lower on the Mac side, never asking less and never missing a
    // frozen request, against any committed copy of its label.
    for (const copy of copies) {
      checked('F1');
      gitStats.copies += 1;
      const at = `${label} against its copy committed at ${copy.commit.slice(0, 8)}${as(copy)}`;
      for (const loss of macSideLosses(copy.wire, set.wire)) fail('F1', `${at}: ${loss}. A Mac-side row lowered, shortened, dropped, re-ruled or moved and resealed is not a re-freeze: it is a retirement of the set, by ruling`);
      for (const loss of requestLosses(copy.wire, set.wire, copy.vectors, set.vectors)) fail('F1', `${at}: ${loss}. A way the frozen phone asks, taken out and resealed, is not a re-freeze: it is a retirement of the set, by ruling`);
    }
  }
}

// ---------------------------------------------------------------------------
// The clauses
// ---------------------------------------------------------------------------

function clauseF(sets, inMemory) {
  if (!inMemory) {
    expects('F3');
    checked('F3');
    if (sets.length < FROZEN_SETS_FLOOR) fail('F3', `${String(sets.length)} frozen set(s) under ${relPath(FROZEN_DIR)}, below the floor of ${String(FROZEN_SETS_FLOOR)}: a frozen phone was removed or never written`);
    // Phase 333.11.2 (SPEC-2 D3): in the canonical directory the floor is an
    // EQUALITY, so a retirement must lower it and a new set must raise it.
    // Under `--into` (a scratch directory) only "at least" applies, and a
    // freeze prints the reminder instead (§3.6).
    else if (FREEZE === null && FROZEN_DIR === CANONICAL_FROZEN_DIR && sets.length > FROZEN_SETS_FLOOR) {
      fail('F3', `${String(sets.length)} frozen sets under ${relPath(FROZEN_DIR)}, above FROZEN_SETS_FLOOR (${String(FROZEN_SETS_FLOOR)}): the commit that adds a set raises the floor, and a retirement lowers it only beside RETIRED_SETS`);
    }
  }
  // F1 without git (Phase 333.11.2, SPEC-2 §3.4): RETIRED_SETS is well
  // formed, (e) one label names one set, and (d) a retired label is never
  // held again. These hold with no repository at all.
  for (const [label, why] of Object.entries(RETIRED_SETS)) {
    expects('F1');
    checked('F1');
    if (!LABEL_PATTERN.test(label)) fail('F1', `RETIRED_SETS names ${JSON.stringify(label)}, which is not a label (${String(LABEL_PATTERN)})`);
    if (typeof why !== 'string' || why.trim() === '') fail('F1', `RETIRED_SETS retires ${JSON.stringify(label)} with no ruling: its value is '<date>: <his words>'`);
  }
  const holders = new Map();
  for (const set of sets) {
    if (!isPlainObject(set.wire) || typeof set.wire.label !== 'string') continue;
    if (!holders.has(set.wire.label)) holders.set(set.wire.label, []);
    holders.get(set.wire.label).push(set.name);
  }
  for (const [label, names] of holders) {
    expects('F1');
    checked('F1');
    if (names.length > 1) fail('F1', `${label} is held by ${names.join(' and ')}: one label names one set`);
    if (Object.hasOwn(RETIRED_SETS, label)) {
      for (const name of names) fail('F1', `${name} holds the label ${label}, which RETIRED_SETS retired (${String(RETIRED_SETS[label])}): a retired label is never reused; freeze a new phone under a new label`);
    }
  }
  for (const set of sets) {
    expects('F1');
    expects('F2');
    checked('F1');
    if (set.wire === null) {
      fail('F1', `${set.name}: not JSON (${String(set.error)})`);
      continue;
    }
    const w = set.wire;
    if (!FORMATS_READ.includes(w.format)) {
      const retired = Object.hasOwn(FORMATS_RETIRED, String(w.format)) ? FORMATS_RETIRED[w.format] : undefined;
      fail('F1', `${set.name}: ${retired ?? `format ${JSON.stringify(w.format)} is not one this gate reads (${FORMATS_READ.join(', ')})`}`);
    }
    if (typeof w.seal !== 'string' || w.seal !== sealOf(w)) fail('F1', `${set.name}: its seal does not hold: the file was edited without --freeze (sealed ${String(w.seal)}, its body hashes to ${sealOf(w)})`);
    checked('F2');
    if (set.vectorsBytes === null) fail('F2', `${set.name}: its vectors file ${String(w.vectors?.file)} does not exist beside it`);
    else if (sha256hex(set.vectorsBytes) !== w.vectors?.sha256) fail('F2', `${set.name}: ${String(w.vectors?.file)} hashes to ${sha256hex(set.vectorsBytes)}, not the ${String(w.vectors?.sha256)} its wire names`);
    // F3: the set holds together.
    expects('F3');
    const types = w.types ?? {};
    for (const r of w.routes ?? []) {
      checked('F3');
      if (types[r.answer] === undefined) fail('F3', `${set.name}: route ${String(r.id)}'s answer ${String(r.answer)} is not one of its types`);
    }
    checked('F3');
    if (membershipOf(w.routes ?? []) !== w.routeMembership) fail('F3', `${set.name}: routeMembership ${String(w.routeMembership)} is not the sha256 of its own routes (${membershipOf(w.routes ?? [])})`);
    if (w.qr?.answer === undefined || types[w.qr.answer] === undefined) fail('F3', `${set.name}: qr.answer ${String(w.qr?.answer)} is not one of its types`);
    const named = (kind, where) => {
      if (kind === null || typeof kind !== 'object') return;
      if (kind.array !== undefined) return named(kind.array, where);
      const n = kind.type ?? kind.words;
      checked('F3');
      if (types[n] === undefined) fail('F3', `${set.name}: ${where} names ${String(n)}, which is not one of its types`);
    };
    for (const [tn, def] of Object.entries(types)) {
      for (const [k, f] of Object.entries(def.fields ?? {})) named(f.kind, `${tn}.${k}`);
      for (const [w2, c] of Object.entries(def.cases ?? {})) for (const [k, f] of Object.entries(c)) named(f.kind, `${tn}.${k} (case ${w2})`);
      for (const flat of def.flattens ?? []) named({ type: flat }, `${tn}'s flatten`);
    }
    if (set.vectors === null) {
      fail('F3', `${set.name}: its vectors cannot be read, so no instance or arm resolves`);
      continue;
    }
    const insts = instancesOf(set.vectors);
    const frozenIds = new Set(Object.keys(w.instances ?? {}));
    for (const [id, route] of Object.entries(w.instances ?? {})) {
      checked('F3');
      const inst = insts.get(id);
      if (inst === undefined) fail('F3', `${set.name}: instance ${id} is not in its vectors`);
      else if (inst.route !== route) fail('F3', `${set.name}: instance ${id} names route ${route}, its vectors say ${inst.route}`);
      if (route !== 'qr' && !(w.routes ?? []).some((r) => r.id === route)) fail('F3', `${set.name}: instance ${id} names ${route}, which is not a frozen route`);
    }
    for (const id of insts.keys()) if (!frozenIds.has(id)) fail('F3', `${set.name}: its vectors hold ${id}, which its instances do not name`);
    // THE ARMS ARE RE-DERIVED, NEVER TRUSTED (the fix round of 2026-10-08).
    // The seal is a sha256 anyone can recompute, so a file whose refuse arms
    // were deleted and then resealed passed F1, and test:ios, which asks for
    // exactly the sealed arms, would have wanted fewer rows with nothing red.
    // The arms are a function of what is sealed beside them (the types, the
    // formats, the routes, the QR's type) and of the vectors F2 holds, so the
    // freeze's own generator is run again here and must give the sealed list
    // back exactly, arm by arm, and the same unarmed fields. `generateArms`
    // is part of format 1: a later change to what it makes is a format 2,
    // which keeps format 1's generator for the sets written with it.
    checked('F3');
    const regenerated = generateArms(w, insts);
    const sealedArms = Array.isArray(w.arms) ? w.arms : [];
    if (reader.canonical(regenerated.arms) !== reader.canonical(sealedArms)) {
      const byId = new Map(sealedArms.map((a) => [a?.id, a]));
      const wantIds = new Set(regenerated.arms.map((a) => a.id));
      const differs = regenerated.arms.filter((a) => reader.canonical(byId.get(a.id) ?? null) !== reader.canonical(a)).map((a) => a.id);
      const extra = sealedArms.filter((a) => !wantIds.has(a?.id)).map((a) => String(a?.id));
      fail(
        'F3',
        `${set.name}: its ${String(sealedArms.length)} sealed arm(s) are not the ${String(regenerated.arms.length)} its own types, formats and instances make (${String(differs.length)} missing or changed${differs.length > 0 ? `, first ${differs.slice(0, 5).join(', ')}` : ''}; ${String(extra.length)} not made${extra.length > 0 ? `, first ${extra.slice(0, 5).join(', ')}` : ''}): the arms were edited by hand and resealed, and the phone's proof of the freeze would shrink with nothing red`
      );
    }
    if (reader.canonical(regenerated.unarmed) !== reader.canonical(w.unarmed ?? null)) fail('F3', `${set.name}: its unarmed list is not the ${String(regenerated.unarmed.length)} field(s) its own instances leave unarmed`);
    for (const arm of w.arms ?? []) {
      checked('F3');
      const inst = insts.get(arm.instance);
      const allowed = ARM_OPS[arm.op];
      if (allowed === undefined) {
        fail('F3', `${set.name}: arm ${String(arm.id)} has op ${String(arm.op)}, which is not one of ${Object.keys(ARM_OPS).join(', ')}`);
        continue;
      }
      if (!allowed.includes(arm.expect)) fail('F3', `${set.name}: arm ${String(arm.id)} expects ${String(arm.expect)}, which ${arm.op} never expects`);
      if (inst === undefined) {
        fail('F3', `${set.name}: arm ${String(arm.id)}'s instance ${String(arm.instance)} is not in its vectors`);
        continue;
      }
      let value;
      try {
        value = JSON.parse(inst.text);
      } catch {
        fail('F3', `${set.name}: arm ${String(arm.id)}'s instance is not JSON`);
        continue;
      }
      const at = resolvePointer(value, arm.pointer ?? '');
      if (arm.op === 'unknown') {
        if (arm.pointer !== '' || typeof arm.key !== 'string') fail('F3', `${set.name}: arm ${String(arm.id)} (unknown) must name a key at the root`);
      } else if (arm.op === 'older') {
        const obj = at.found ? at.value : null;
        if (obj === null || typeof obj !== 'object' || !Array.isArray(arm.keys) || !arm.keys.every((k) => Object.hasOwn(obj, k))) fail('F3', `${set.name}: arm ${String(arm.id)} (older) does not resolve at ${String(arm.pointer)}`);
      } else if (arm.op === 'add') {
        if (!at.parentFound || at.found) fail('F3', `${set.name}: arm ${String(arm.id)} (add) at ${String(arm.pointer)}: the key is already there or its object is not`);
      } else if (!at.found) {
        fail('F3', `${set.name}: arm ${String(arm.id)} (${arm.op}) points at ${String(arm.pointer)}, which ${arm.instance} does not hold`);
      }
    }
    // Format 2: the request record and the asks hold together (SPEC-1 §4.3).
    clauseF3Record(set);
  }
}

function clauseF4() {
  expects('F4');
  const read = (rel) => (existsSync(join(ROOT, rel)) ? readFileSync(join(ROOT, rel), 'utf8') : null);
  checked('F4');
  let build = '';
  try {
    build = JSON.parse(read('package.json') ?? '{}').scripts?.build ?? '';
  } catch {
    build = '';
  }
  if (!build.includes('build/assert-door-only-adds.mjs')) fail('F4', "package.json's build does not run build/assert-door-only-adds.mjs");
  checked('F4');
  if (!(read('build/verification-checks.mjs') ?? '').includes("'gate:onlyadd'")) fail('F4', 'build/verification-checks.mjs does not classify gate:onlyadd');
  checked('F4');
  const testIos = read('build/p316/test-ios.mjs') ?? '';
  const suites = /export\s+const\s+P33311_SUITES\s*=\s*([^\n;]*)/.exec(testIos);
  if (suites === null || !suites[1].includes('DoorFrozenTests')) fail('F4', 'build/p316/test-ios.mjs exports no P33311_SUITES naming DoorFrozenTests');
  if (!testIos.includes('P33311_PROOF')) fail('F4', 'build/p316/test-ios.mjs does not pass P33311_PROOF');
  checked('F4');
  const swift = read('ios/TortieTests/DoorFrozenTests.swift');
  if (swift === null) fail('F4', 'ios/TortieTests/DoorFrozenTests.swift does not exist: the phone half that decodes the frozen answers is gone');
  else if (!swift.includes('Fixtures/frozen') && !(swift.includes('"frozen"') && swift.includes('"Fixtures"'))) fail('F4', 'ios/TortieTests/DoorFrozenTests.swift names no Fixtures/frozen');
  checked('F4');
  const ios = read('build/conformance-ios.mjs') ?? '';
  const j = ios.indexOf('// (j)');
  const k = ios.indexOf('// (k)', j);
  const block = j < 0 ? '' : ios.slice(j, k < 0 ? j + 2000 : k);
  if (!(block.includes('spawnSync') && block.includes("'vectors.mjs'") && block.includes("'--check'"))) fail('F4', "build/conformance-ios.mjs's rule j no longer spawns build/p316/vectors.mjs --check, so vectors.json may drift from the shipping TypeScript");
}

/** The shipping table's rows, read with the parser as conformance:pocket R4 reads them. */
function tableRows() {
  const sf = astOf(join(ROOT, 'src', 'main', 'pocket', 'door', 'table.ts'));
  const decl = sf === null ? null : constDecl(sf, 'POCKET_ROUTES');
  let init = decl?.initializer ?? null;
  if (init !== null && ts.isCallExpression(init) && init.expression.getText(sf) === 'Object.freeze') init = init.arguments[0] ?? null;
  if (init === null || !ts.isArrayLiteralExpression(init)) return null;
  const rows = [];
  for (const el of init.elements) {
    if (!ts.isObjectLiteralExpression(el)) return null;
    const row = {};
    for (const p of el.properties) {
      if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
      const v = p.initializer;
      if (ts.isStringLiteral(v)) row[p.name.text] = v.text;
      else if (v.kind === ts.SyntaxKind.TrueKeyword) row[p.name.text] = true;
      else if (v.kind === ts.SyntaxKind.FalseKeyword) row[p.name.text] = false;
    }
    rows.push(row);
  }
  return rows;
}

function clauseR1(sets) {
  const rows = tableRows();
  const ids = macConstant('src/shared/ipc/pocket.ts', 'POCKET_ROUTE_IDS');
  for (const set of sets) {
    for (const fr of set.wire?.routes ?? []) {
      expects('R1');
      checked('R1');
      if (rows === null) {
        fail('R1', 'src/main/pocket/door/table.ts: POCKET_ROUTES could not be read as a list of literal rows');
        return;
      }
      const row = rows.find((r) => r.id === fr.id);
      if (row === undefined) {
        fail('R1', `${fr.id} (${fr.method} ${fr.path}): no row of the shipping POCKET_ROUTES, so every old phone's ${fr.path} is refused`);
        continue;
      }
      for (const k of ['method', 'path', 'signed', 'windowOnly', 'reads']) {
        if (row[k] !== fr[k]) fail('R1', `${fr.id}: ${k} is ${JSON.stringify(row[k])} in the shipping table, ${JSON.stringify(fr[k])} when frozen`);
      }
      if (ids.error !== undefined) fail('R1', ids.error);
      else if (!ids.value.includes(fr.id)) fail('R1', `${fr.id} is not one of the shipping POCKET_ROUTE_IDS`);
    }
  }
}

const PKCS8 = { ed25519: '302e020100300506032b657004220420', x25519: '302e020100300506032b656e04220420' };
/** The frozen identity, opened by the SHIPPING reader over the frozen Mac seeds; the phone as its fields. */
function frozenParties(vectors) {
  const k = vectors.keys;
  const mac = pairing.openIdentity({
    signPrivate: Buffer.concat([Buffer.from(PKCS8.ed25519, 'hex'), Buffer.from(k.macSigningSeed, 'hex')]).toString('base64url'),
    exchangePrivate: Buffer.concat([Buffer.from(PKCS8.x25519, 'hex'), Buffer.from(k.macExchangeSeed, 'hex')]).toString('base64url')
  });
  const phone = {
    id: vectors.identity.phoneId,
    label: vectors.seal?.label ?? '',
    signingKey: k.phoneSigningKey,
    exchangeKey: k.phoneExchangeKey,
    clientKey: k.clientKey,
    pushToken: '',
    pushEnvironment: ''
  };
  return { mac, phone };
}

/** What R2 replayed, for the PASS line and the summary. */
const replayStats = { frozen: 0, generated: 0 };

async function clauseR2(sets) {
  for (const set of sets) {
    const w = set.wire;
    const v = set.vectors;
    if (w === null || v === null) continue;
    // Every request the frozen phone can make (SPEC-1 §4.4): the frozen ones
    // and every other point of its sealed record's cross product. A proof
    // that fails, or a product past the ceiling, is red by name, and nothing
    // of that set is replayed.
    const replays = replaysOf(set);
    if (replays.frozen.length > 0 || replays.problems.length > 0) expects('R2');
    for (const p of replays.problems) fail('R2', `${set.name}: ${p}`);
    for (const n of replays.notes) note('R2', n);
    if (replays.problems.length > 0) continue;
    const requests = [...replays.frozen, ...replays.generated];
    if (pairing.loadError !== undefined || tableMod.loadError !== undefined || routesMod.loadError !== undefined || writesMod.loadError !== undefined || limitsMod.loadError !== undefined) {
      fail('R2', `the shipping door could not be loaded: ${[pairing, tableMod, routesMod, writesMod, limitsMod].map((m) => m.loadError).filter(Boolean).join('; ')}`);
      return;
    }
    // PHASE 333.12: the door a launch store sets up serves this, and no more.
    const launch = launchServed();
    if (launch.error !== undefined) {
      fail('R2', launch.error);
      return;
    }
    let parties;
    try {
      parties = frozenParties(v);
    } catch (err) {
      fail('R2', `${set.name}: the shipping openIdentity cannot open the frozen Mac seeds: ${String(err.message)}`);
      continue;
    }
    for (const r of requests) {
      checked('R2');
      if (r.generated === true) replayStats.generated += 1;
      else replayStats.frozen += 1;
      const where = `${set.name} request ${String(r.name)}${r.generated === true ? ` (${r.method} ${String(r.target).slice(0, 100)}${r.method === 'GET' ? '' : ` ${String(r.body).slice(0, 100)}`})` : ''}`;
      const pathname = String(r.target).split('?')[0];
      const facts = { method: r.method, target: r.target, bodySha256: sha256hex(Buffer.from(r.body ?? '', 'utf8')), timestamp: r.timestamp, nonce: r.nonce, binding: v.identity.binding };
      if (pairing.canonicalRequestText(facts) !== r.canonical) fail('R2', `${where}: the shipping canonicalRequestText no longer writes the text the old phone signed`);
      const fr = (w.routes ?? []).find((x) => x.method === r.method && x.path === pathname);
      if (fr === undefined || !fr.signed) continue; // a request on no signed route: its canonical text is its whole check
      const route = tableMod.matchPocketRoute(r.method, pathname);
      if (route === null || route.id !== fr.id) {
        fail('R2', `${where}: the shipping matchPocketRoute finds ${route === null ? 'no route' : route.id} for ${r.method} ${pathname}, not ${fr.id}`);
        continue;
      }
      const url = new URL(r.target, BASE);
      if (`${url.pathname}${url.search}` !== r.target) fail('R2', `${where}: the door's URL parser reads ${url.pathname}${url.search}`);
      if (r.id !== null && r.id !== undefined && url.searchParams.get('id') !== r.id) fail('R2', `${where}: the door reads another id`);
      const verifier = new pairing.PocketRequestVerifier({ identity: () => parties.mac, phones: () => [parties.phone], now: () => Number(r.timestamp) });
      const verdict = verifier.verify({
        method: r.method,
        target: r.target,
        body: Buffer.from(r.body ?? '', 'utf8'),
        channel: parties.phone.id,
        headers: { 'x-tortie-phone': parties.phone.id, 'x-tortie-timestamp': r.timestamp, 'x-tortie-nonce': r.nonce, 'x-tortie-signature': r.signature }
      });
      if (!verdict.ok) fail('R2', `${where}: the shipping verifier refuses it (${verdict.reason})`);
      const q = url.searchParams;
      if (fr.id === 'sessions') {
        const read = routesMod.readSessionsQuery(q);
        if (!read.ok) fail('R2', `${where}: the shipping readSessionsQuery refuses it (${read.reason})`);
        else if (r.asked !== undefined && reader.canonical(read.asked) !== reader.canonical(r.asked)) fail('R2', `${where}: the shipping readSessionsQuery reads ${JSON.stringify(read.asked)}, not ${JSON.stringify(r.asked)}`);
      } else if (fr.id === 'screen') {
        const read = routesMod.readScreenQuery(q);
        if (!read.ok) fail('R2', `${where}: the shipping readScreenQuery refuses it (${read.reason})`);
        else if (read.id !== q.get('id') || read.since !== q.get('since')) fail('R2', `${where}: the shipping readScreenQuery reads ${JSON.stringify({ id: read.id, since: read.since })}, not the id and since the target spells`);
      } else if (fr.id === 'scrollback') {
        const read = routesMod.readScrollbackQuery(q);
        if (!read.ok) fail('R2', `${where}: the shipping readScrollbackQuery refuses it (${read.reason})`);
        else if (r.page !== undefined && reader.canonical({ id: read.id, ...read.ask }) !== reader.canonical(r.page)) fail('R2', `${where}: the shipping readScrollbackQuery reads ${JSON.stringify({ id: read.id, ...read.ask })}`);
      } else if (fr.id === 'turns') {
        const read = routesMod.readTurnRange({ limit: q.get('limit'), from: q.get('from'), to: q.get('to') });
        const limit = Number(q.get('limit') ?? '');
        if (!read.ok) fail('R2', `${where}: the shipping readTurnRange refuses it (${read.reason})`);
        else if (q.get('to') !== null && read.to !== Number(q.get('to'))) fail('R2', `${where}: the shipping readTurnRange reads to=${String(read.to)}`);
        if (q.get('limit') !== null && !(Number.isFinite(limit) && limit > 0)) fail('R2', `${where}: its limit is not one the route keeps`);
      }
      if (fr.reads === false) {
        const cap = limitsMod.POCKET_WRITE_BODY_CAPS?.[fr.id];
        const bytes = Buffer.byteLength(r.body ?? '', 'utf8');
        if (typeof cap !== 'number' || bytes > cap) fail('R2', `${where}: its ${String(bytes)}-byte body is over the shipping cap ${String(cap)}`);
        const calls = [];
        const writes = {
          end: async (input) => (calls.push({ verb: 'end', input }), { outcome: 'done' }),
          choose: async (input) => (calls.push({ verb: 'choose', input }), { outcome: 'done' }),
          say: async (input) => (calls.push({ verb: 'say', input }), { outcome: 'done' }),
          keys: async (input) => (calls.push({ verb: 'keys', input }), { outcome: 'done' })
        };
        const handler = writesMod.createPocketWriteHandler({ shuttingDown: () => false, stillPaired: () => true, routeServed: (id) => launch.served.includes(id), writes, now: () => Number(r.timestamp) });
        const answer = await quietly(() => handler(route, Buffer.from(r.body ?? '', 'utf8'), parties.phone.id, { stopping: () => false }));
        let body = null;
        try {
          body = JSON.parse(r.body);
        } catch {
          body = null;
        }
        const want = body === null ? null : {
          end: { sessionId: body.session, batch: body.batch },
          choose: { sessionId: body.session, question: body.question, mark: body.mark, marker: body.marker },
          say: { sessionId: body.session, text: body.text },
          keys: { sessionId: body.session, keys: body.keys, turn: body.turn, dialog: body.dialog }
        }[fr.id];
        if (answer?.status !== 200) fail('R2', `${where}: the shipping write path answers ${String(answer?.status)}`);
        if (calls.length !== 1 || calls[0].verb !== fr.id) fail('R2', `${where}: the shipping write path reached ${calls.map((c) => c.verb).join(', ') || 'no verb'}, not exactly ${fr.id}`);
        else if (want !== null && reader.canonical(calls[0].input) !== reader.canonical(want)) fail('R2', `${where}: the shipping write path handed the verb ${JSON.stringify(calls[0].input).slice(0, 120)}, not the frozen body's fields`);
        const out = [];
        if (typeof answer?.body === 'string') {
          conformInstance(w, `${where} answer`, { route: fr.id }, answer.body, out, { fields: 0, formats: 0, bounds: 0 });
          const parsed = JSON.parse(answer.body);
          if (parsed.verb !== fr.id || parsed.outcome !== 'done' || (body !== null && parsed.write !== body.write)) out.push(`${where}: answered ${answer.body.slice(0, 120)}`);
        } else out.push(`${where}: the shipping write path answered no body`);
        for (const o of out) fail('R2', o);
      }
    }
  }
}

function clauseR3(sets) {
  for (const set of sets) {
    const v = set.vectors;
    if (v === null || set.wire === null) continue;
    const bodies = [
      ['seal.fromPhone', v.seal?.fromPhone?.body, null],
      ['pushSeal', v.pushSeal?.body, v.pushSeal]
    ].filter(([, body]) => typeof body === 'string');
    if (bodies.length > 0) expects('R3');
    if (pairing.loadError !== undefined) {
      fail('R3', pairing.loadError);
      return;
    }
    let parties;
    try {
      parties = frozenParties(v);
    } catch (err) {
      fail('R3', `${set.name}: ${String(err.message)}`);
      continue;
    }
    const secret = Buffer.from(v.seal.secret, 'base64url');
    if (pairing.pairingChallengeOf(secret) !== v.seal.challenge) fail('R3', `${set.name}: the shipping pairingChallengeOf no longer derives the window's challenge the old phone signs over`);
    let routeIds = [];
    try {
      routeIds = macConstant('src/shared/ipc/pocket.ts', 'POCKET_ROUTE_IDS').value ?? [];
    } catch {
      routeIds = [];
    }
    const opener = new pairing.PocketPairing({
      identity: () => parties.mac,
      fieldsNow: () => ({ funnelProgram: '/p33311/gate/tailscale', tailnet: 'p33311-gate.example', publicName: 'p33311-mac.tail00000.ts.net', publicPort: 8443, bindAtLaunch: false, routes: [...routeIds], phones: [], pushAlerts: false }),
      savePhones: () => true,
      publicKeyPin: () => v.pins?.[0]?.pin ?? '',
      issueCertificate: () => v.client?.certificateDer ?? '',
      now: () => 1_790_000_000_000
    });
    for (const [name, body, push] of bodies) {
      checked('R3');
      const where = `${set.name} ${name}`;
      let outer;
      try {
        outer = JSON.parse(body);
      } catch {
        fail('R3', `${where}: its body is not JSON`);
        continue;
      }
      let opened = null;
      try {
        opened = opener.openPresentation(secret, outer);
      } catch (err) {
        fail('R3', `${where}: the shipping opener threw: ${String(err.message)}`);
        continue;
      }
      if (opened === null) {
        fail('R3', `${where}: the shipping openPresentation refuses the presentation the old phone sends, so it can never pair`);
        continue;
      }
      const want = { label: v.seal.label, signingKey: v.keys.phoneSigningKey, exchangeKey: v.keys.phoneExchangeKey, clientKey: v.keys.clientKey };
      for (const [k, x] of Object.entries(want)) if (opened[k] !== x) fail('R3', `${where}: opens to ${k} ${JSON.stringify(opened[k])?.slice(0, 40)}, not the frozen one`);
      if (push !== null && (opened.pushToken !== push.token || opened.pushEnvironment !== push.environment)) fail('R3', `${where}: opens to another alert address`);
      let proof = false;
      try {
        const text = pairing.presentationProofText(v.seal.challenge, outer.iv, outer.ct, outer.tag);
        proof = verifyWith(null, Buffer.from(text, 'utf8'), createPublicKey({ key: Buffer.from(outer.ek, 'base64url'), format: 'der', type: 'spki' }), Buffer.from(outer.sig, 'base64url'));
      } catch {
        proof = false;
      }
      if (!proof) fail('R3', `${where}: its signature does not hold over the shipping presentationProofText`);
    }
  }
}

/**
 * The sentence for an ask the Mac falls short of (SPEC-1 §4.6), by the
 * phone's constant; any other ask is said in the general words below.
 */
const ASK_SAYS = {
  'DoorLine.keptLines+1': 'connections the phone opens at once',
  'ScreenKeySender.mostItems': 'keys the phone sends in one write',
  'ScreenKeySender.mostTextBytes': 'text bytes the phone sends in one keys write',
  'ScrollbackLayout.pageRows+overlapRows': 'rows one scrollback page asks for',
  'DoorLine.freshFor': 'the phone keeps a line'
};

/**
 * R4's half for THE PHONE'S OWN NUMBERS (SPEC-1 D7, §4.6): the asks of
 * today's reading and of every sealed set, joined by the phone's constant and
 * each held at the LARGEST value any of them names, so a resealed ask cannot
 * lower a floor the Swift still states, and a sealed ask today's reader no
 * longer names still holds at its sealed value.
 */
function clauseR4Asks(sets, today) {
  const joined = new Map();
  const take = (row) => {
    if (!isPlainObject(row) || typeof row.phone !== 'string' || typeof row.value !== 'number' || !Number.isFinite(row.value)) return; // F3 names a malformed sealed ask, P0 an unread one
    const entry = joined.get(row.phone) ?? { value: -Infinity, swift: null, macs: new Map() };
    if (row.value > entry.value) {
      entry.value = row.value;
      entry.swift = typeof row.swift === 'string' ? row.swift : entry.swift;
    }
    // The file the gate's own tables name for the constant, never a sealed
    // decoy's (the fix round); the sealed file only when no table names it.
    const macFile = gateFileOf(row.mac) ?? row.macFile;
    entry.macs.set(`${String(row.mac)}|${String(macFile)}|${String(row.rule)}`, { mac: row.mac, macFile, rule: row.rule });
    joined.set(row.phone, entry);
  };
  for (const row of Array.isArray(today.asks) ? today.asks : []) take(row);
  for (const set of sets) for (const row of Array.isArray(set.wire?.asks) ? set.wire.asks : []) take(row);
  for (const [phone, { value, swift, macs }] of [...joined].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const { mac, macFile, rule } of macs.values()) {
      expects('R4');
      checked('R4');
      if (typeof mac !== 'string' || typeof macFile !== 'string') {
        fail('R4', `the ask ${phone} names no Mac constant and file`);
        continue;
      }
      const now = macConstant(macFile, mac);
      if (now.error !== undefined) {
        fail('R4', `${mac}: ${now.error}`);
        continue;
      }
      const x = now.value;
      const said = Object.hasOwn(ASK_SAYS, phone) ? ASK_SAYS[phone] : undefined;
      const from = `\`${phone}\`, ${swift ?? 'its Swift'}`;
      if (rule === 'mac>=phone') {
        if (!(typeof x === 'number' && x >= value)) fail('R4', `\`${mac}\` is ${String(x)}, below the ${String(value)} ${said ?? "the phone's own Swift asks of it"} (${from})`);
      } else if (rule === 'mac>phone*1000') {
        if (!(typeof x === 'number' && x > value * 1000)) fail('R4', `\`${mac}\` is ${String(x)} ms, not more than the ${String(value)} s ${said ?? "the phone's own Swift holds"} (${from})${phone === 'DoorLine.freshFor' ? ': the door would close a line the phone still means to reuse' : ''}`);
      } else fail('R4', `the ask ${phone} holds ${mac} by ${String(rule)}, which is not ${ASK_RULES.join(' or ')}`);
    }
  }
}

/** R4: the frozen limits and words first, then the phone's own numbers (SPEC-1 §4.6). */
function clauseR4(sets, today) {
  clauseR4Frozen(sets);
  clauseR4Asks(sets, today);
}

/**
 * R4's frozen half. Every constant is read from the file the gate's own
 * tables name for it, and from the sealed file only when no table names it
 * (the fix round, the reverify's W22: a row resealed to point at a decoy
 * holding the old value read the decoy). The words the frozen phone sends
 * are held against the sealed list AND the list the reader's own SEND_ROWS
 * names for the same phone enum, read from its own file in its own form.
 */
function clauseR4Frozen(sets) {
  for (const conflict of GATE_FILE_CONFLICTS) {
    expects('R4');
    fail('R4', conflict);
  }
  for (const set of sets) {
    for (const row of set.wire?.macLimits ?? []) {
      expects('R4');
      checked('R4');
      const file = gateFileOf(row.mac) ?? row.file;
      const now = macConstant(file, row.mac);
      if (now.error !== undefined) fail('R4', `${row.mac}: ${now.error}`);
      else if (typeof now.value !== 'number' || now.value < row.value) fail('R4', `${row.mac} is ${String(now.value)} today, below the ${String(row.value)} an old phone's requests were built to fit (${file})`);
    }
    for (const row of set.wire?.sends ?? []) {
      const own = reader.SEND_ROWS.find((r) => r.phone === row.phone);
      const lists = [{ mac: row.mac, file: gateFileOf(row.mac) ?? row.macFile, form: own !== undefined && own.mac === row.mac ? own.macForm : row.macForm }];
      if (own !== undefined && own.mac !== row.mac) lists.push({ mac: own.mac, file: own.macFile, form: own.macForm });
      for (const { mac, file, form } of lists) {
        expects('R4');
        checked('R4');
        const now = macWords(file, mac, form);
        if (now.error !== undefined) {
          fail('R4', `${mac}: ${now.error}`);
          continue;
        }
        const lost = (row.words ?? []).filter((w) => !now.value.includes(w));
        if (lost.length > 0) fail('R4', `${mac} no longer reads ${lost.join(', ')}, which the frozen phone sends as ${row.phone}`);
      }
    }
  }
}

/**
 * Main's read switch, found by the parser: the `answer:` arrow in
 * src/main/pocket/ipc.ts whose body switches on `route.id`.
 */
function readSwitchOf(ipc) {
  let arrow = null;
  let sw = null;
  if (ipc === null) return { arrow, sw };
  eachNode(ipc, (n) => {
    if (sw !== null || !ts.isPropertyAssignment(n) || n.name.getText(ipc) !== 'answer' || !ts.isArrowFunction(n.initializer)) return;
    eachNode(n.initializer, (m) => {
      if (sw === null && ts.isSwitchStatement(m) && m.expression.getText(ipc) === 'route.id') sw = m;
    });
    if (sw !== null) arrow = n.initializer;
  });
  return { arrow, sw };
}

/**
 * THE READ SWITCH, MADE CALLABLE (R5, the fix round of 2026-10-08). The
 * verifier added `|| query.get('v') === null` to the turns arm and
 * `query.get('v') === null ? null :` to the blocked arm: every launch phone's
 * /v1/turns and /v1/blocked (its main list) would answer 404, and this clause,
 * which read the switch as TEXT, passed both. So the arrow main runs is cut
 * out of the file by the parser, transpiled in memory and closed over a
 * `routes` the caller hands it, and the very code main runs decides what each
 * frozen request reaches, whatever shape the condition takes. It is handed
 * `routes`, `route`, `query` and `closing` and nothing else; an arm that names
 * anything else throws when driven, which is red with what it named, never
 * skipped. The text made into a function is the judged checkout's own
 * source, which this gate already runs by importing routes.ts and writes.ts;
 * `conformance:pocket` makes its tick table callable the same way.
 */
function callableReadSwitch(ipc, arrow) {
  const src = `function p33311AnswerOver(routes) {\n  return (${arrow.getText(ipc)});\n}\n`;
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(`${js}\nreturn p33311AnswerOver;`)();
}

/** A `routes` that answers every member with a fresh marker and records the call. */
function recordingRoutes() {
  const calls = [];
  const routes = new Proxy(
    {},
    {
      get: (_target, member) =>
        typeof member !== 'string' || member === 'then'
          ? undefined
          : (...args) => {
              const answer = { p33311Answer: calls.length };
              calls.push({ member, args, answer });
              return answer;
            }
    }
  );
  return { routes, calls };
}

/** Does a frozen query word reach a route's arguments, whatever shape the arm hands it in? */
function wordReaches(args, name, value) {
  return args.some((a) => {
    if (a instanceof URLSearchParams) return a.getAll(name).includes(value);
    if (typeof a === 'string' || typeof a === 'number') return String(a) === value;
    if (a !== null && typeof a === 'object' && Object.hasOwn(a, name) && a[name] !== null && a[name] !== undefined) return String(a[name]) === value;
    return false;
  });
}

async function clauseR5(sets) {
  const ipc = astOf(join(ROOT, 'src', 'main', 'pocket', 'ipc.ts'));
  const { arrow, sw } = readSwitchOf(ipc);
  let answerOver = null;
  let unmade = null;
  if (arrow !== null) {
    try {
      answerOver = callableReadSwitch(ipc, arrow);
    } catch (err) {
      unmade = String(err?.message ?? err);
    }
  }
  const arms = new Map();
  if (sw !== null) {
    const clauses = sw.caseBlock.clauses;
    clauses.forEach((c, i) => {
      if (!ts.isCaseClause(c) || !ts.isStringLiteral(c.expression)) return;
      let j = i;
      while (j < clauses.length && clauses[j].statements.length === 0) j += 1;
      arms.set(c.expression.text, clauses[j] ?? null);
    });
  }
  const writes = macConstant('src/shared/ipc/pocket.ts', 'POCKET_WRITE_ROUTE_IDS');
  const serverLoaded = serverMod.loadError === undefined && typeof serverMod.createPocketHandler === 'function';
  // PHASE 333.12: main is handed the served set of a door a launch store sets up.
  const launch = launchServed();
  const door = { stopping: () => false };
  for (const set of sets) {
    const w = set.wire;
    const v = set.vectors;
    if (w === null) continue;
    // The verifier the door is handed, as ipc.ts hands it: the SHIPPING one,
    // over the frozen Mac seeds and the frozen phone, at each request's own
    // clock (R2 owns what it refuses; here it only lets the request through).
    let parties = null;
    try {
      parties = v === null || pairing.loadError !== undefined ? null : frozenParties(v);
    } catch {
      parties = null;
    }
    /** One request through the SHIPPING server.ts handler, its `answer` the read switch over `routes`. */
    const throughDoor = async (request, deps) => {
      if (!serverLoaded) throw new Error(`src/main/pocket/server.ts could not be loaded${serverMod.loadError === undefined ? ' (it exports no createPocketHandler)' : `: ${serverMod.loadError}`}`);
      if (launch.error !== undefined) throw new Error(launch.error);
      const handle = serverMod.createPocketHandler({
        shuttingDown: () => false,
        routeServed: (id) => launch.served.includes(id),
        pairingWindowOpen: () => false,
        present: () => {
          throw new Error('a read is never a presentation');
        },
        stillPaired: () => true,
        answer: async () => null,
        ...deps
      });
      return quietly(() => handle(request, door));
    };
    for (const fr of w.routes ?? []) {
      expects('R5');
      checked('R5');
      if (fr.reads === false) {
        if (writes.error !== undefined) fail('R5', writes.error);
        else if (!writes.value.includes(fr.id)) fail('R5', `${fr.id} is not one of the shipping POCKET_WRITE_ROUTE_IDS, so the one write path never answers it`);
        continue;
      }
      if (fr.id === 'pair') {
        // Every frozen /pair answer, handed to server.ts's pair arm as the
        // pairing owner's state, must leave as an answer the frozen phone
        // reads, in its own state.
        const answers = Object.entries(v?.pairAnswers ?? {});
        if (answers.length === 0) note('R5', `${set.name}: no frozen /pair answer to drive; pair is held by R1 alone`);
        for (const [name, text] of answers) {
          checked('R5');
          const where = `${set.name} pairAnswers/${name}`;
          let given = null;
          try {
            given = JSON.parse(text);
            const res = await throughDoor({ route: 'pair', presentation: {} }, { pairingWindowOpen: () => true, present: () => given });
            const out = [];
            if (res?.status !== 200 || typeof res?.body !== 'string') out.push(`${where}: server.ts answers ${String(res?.status)} to a pairing in a window, so no old phone can pair`);
            else {
              conformInstance(w, where, { route: 'pair' }, res.body, out, { fields: 0, formats: 0, bounds: 0 });
              if (JSON.parse(res.body).state !== given?.state) out.push(`${where}: server.ts answers ${res.body.slice(0, 80)}, not the state ${String(given?.state)} the pairing owner gave it`);
            }
            for (const o of out) fail('R5', o);
          } catch (err) {
            fail('R5', `${where}: server.ts's pair arm could not be driven: ${String(err?.message ?? err)}`);
          }
        }
        continue;
      }
      if (sw === null) {
        fail('R5', "src/main/pocket/ipc.ts: the read switch (the answer: arrow's switch on route.id) cannot be found");
        return;
      }
      const arm = arms.get(fr.id);
      if (arm === undefined || arm === null) {
        fail('R5', `${fr.id}: main's read switch has no case '${fr.id}', so the door answers every old phone's ${fr.path} 404`);
        continue;
      }
      let answers = false;
      eachNode(arm, (m) => {
        if (ts.isReturnStatement(m) && m.expression !== undefined) {
          eachNode(m.expression, (c) => {
            if (ts.isCallExpression(c) && c.expression.getText(ipc) === `routes.${fr.id}`) answers = true;
          });
        }
      });
      if (!answers) fail('R5', `${fr.id}: main's case '${fr.id}' returns no routes.${fr.id}(…)`);
      // DRIVEN: every request the frozen phone can make on this route (R2's
      // replay set, SPEC-1 §4.4: the frozen ones, and every other way it asks
      // with a sometimes-sent name absent or present and every word of each
      // closed set), through server.ts into the read switch main runs. Each
      // must reach routes.<id> exactly once, hand it every word of its query,
      // and be answered 200 with what routes.<id> answered: an arm that
      // answers null to a way the launch phone asks is a 404 to that phone.
      // When R2's proofs failed, only the frozen requests are driven here.
      const replays = v === null ? null : replaysOf(set);
      const pool = replays === null ? [] : [...replays.frozen, ...(replays.problems.length === 0 ? replays.generated : [])];
      const requests = pool.filter((r) => r.method === fr.method && String(r.target).split('?')[0] === fr.path);
      if (requests.length === 0) {
        note('R5', `${set.name}: no frozen request on ${fr.method} ${fr.path} to drive; its arm is held as text alone`);
        continue;
      }
      if (answerOver === null) {
        fail('R5', `src/main/pocket/ipc.ts: the read switch cannot be made callable${unmade === null ? '' : `: ${unmade}`}`);
        continue;
      }
      for (const r of requests) {
        checked('R5');
        const where = `${set.name} request ${String(r.name)}${r.generated === true ? ` (${String(r.target).slice(0, 100)})` : ''}`;
        const { routes, calls } = recordingRoutes();
        let res;
        try {
          const answer = answerOver(routes);
          const verifier = parties === null ? null : new pairing.PocketRequestVerifier({ identity: () => parties.mac, phones: () => [parties.phone], now: () => Number(r.timestamp) });
          res = await throughDoor(
            {
              route: fr.id,
              method: r.method,
              target: r.target,
              headers: { 'x-tortie-phone': v.identity?.phoneId, 'x-tortie-timestamp': r.timestamp, 'x-tortie-nonce': r.nonce, 'x-tortie-signature': r.signature },
              body: Buffer.from(r.body ?? '', 'utf8'),
              channel: v.identity?.phoneId ?? null
            },
            {
              verify: (input) => {
                if (verifier === null) return { ok: true, phoneId: String(v.identity?.phoneId) };
                const verdict = verifier.verify(input);
                return verdict.ok ? { ok: true, phoneId: verdict.phone.id } : { ok: false, reason: verdict.reason };
              },
              answer: (route, query, closing) => answer(route, query, closing)
            }
          );
        } catch (err) {
          fail('R5', `${where}: main's read switch could not be driven: ${String(err?.message ?? err)}`);
          continue;
        }
        const reached = calls.filter((c) => c.member === fr.id);
        if (calls.length !== 1 || reached.length !== 1) {
          fail('R5', `${where}: main's read switch reached ${calls.length === 0 ? 'no route' : calls.map((c) => `routes.${c.member}`).join(', ')} for ${r.method} ${String(r.target).slice(0, 80)}, not routes.${fr.id} once, so the door answers this old phone's request ${res?.status === 200 ? 'with something else' : '404'}`);
          continue;
        }
        if (res?.status !== 200 || res?.body !== JSON.stringify(reached[0].answer)) {
          fail('R5', `${where}: the door answers ${String(res?.status)}${typeof res?.body === 'string' ? ` ${res.body.slice(0, 60)}` : ''}, not 200 with what routes.${fr.id} answered`);
          continue;
        }
        const at = String(r.target).indexOf('?');
        for (const [name, value] of new URLSearchParams(at === -1 ? '' : String(r.target).slice(at + 1))) {
          if (!wordReaches(reached[0].args, name, value)) fail('R5', `${where}: its ${name}=${value.slice(0, 40)} does not reach routes.${fr.id}: main's read switch drops or renames a word the old phone sends`);
        }
      }
    }
  }
}

/**
 * R7, A LAUNCH-SHAPED STORE KEEPS THE ELEVEN'S HASH (Phase 333.12,
 * build/p33312/SPEC.md §6.3). Every stranger's Mac holds a store a 0.111.x
 * Mac wrote, which has no `allowedRoutes`. The update that brings Phase
 * 333.12 must read that store as allowing exactly the routes the launch phone
 * calls, hash it as 0.111.x hashed it, and serve every one of them, or every
 * paired phone reads `changed` and goes dark: the outage this phase ends.
 */
const LAUNCH_STORE_KEYS = ['identity', 'phones', 'publicPort', 'tailnetFacts', 'bindAtLaunch', 'enabled', 'pushAlerts', 'deadPushTokens', 'nameConfirmed'];
function clauseR7(sets) {
  expects('R7');
  const missing = [allowedMod, contractMod, pairing, routesMod].map((m) => m.loadError).filter(Boolean);
  if (missing.length > 0) {
    fail('R7', `the shipping allowed set, contract, pairing or routes could not be loaded: ${missing.join('; ')}`);
    return;
  }
  const legacy = contractMod.LEGACY_ALLOWED_ROUTES;
  checked('R7');
  if (!Array.isArray(legacy)) {
    fail('R7', 'src/shared/ipc/pocket.ts exports no LEGACY_ALLOWED_ROUTES list');
    return;
  }
  const sorted = (xs) => JSON.stringify([...xs].sort());
  const launchSet = sets.find((x) => x.wire?.label === 'launch');
  checked('R7');
  if (launchSet === undefined) fail('R7', 'no frozen set is labelled launch, so LEGACY_ALLOWED_ROUTES has nothing to be held to');
  else if (sorted(legacy) !== sorted((launchSet.wire.routes ?? []).map((r) => r.id))) {
    fail('R7', `LEGACY_ALLOWED_ROUTES is ${JSON.stringify(legacy)}, and the launch set's routes are ${sorted((launchSet.wire.routes ?? []).map((r) => r.id))}: the eleven every 0.111.x store allows are not the routes the launch phone calls`);
  }
  // A store as 0.111.x writes it: exactly these keys, and no allowedRoutes.
  const store = {
    identity: { signPrivate: 'p33312-sign', exchangePrivate: 'p33312-exchange' },
    phones: [],
    publicPort: 8443,
    tailnetFacts: { funnelProgram: '/p33312/tailscale', tailnet: 'p33312.example', publicName: 'p33311-mac.tail00000.ts.net' },
    bindAtLaunch: false,
    enabled: true,
    pushAlerts: false,
    deadPushTokens: [],
    nameConfirmed: null
  };
  checked('R7');
  if (JSON.stringify(Object.keys(store)) !== JSON.stringify(LAUNCH_STORE_KEYS) || Object.hasOwn(store, 'allowedRoutes')) fail('R7', 'the launch-shaped store this clause builds is not shaped as 0.111.x writes it (the gate\'s own defect)');
  let allowed;
  try {
    allowed = allowedMod.allowedRoutesFor(allowedMod.allowedRoutesOf(store.allowedRoutes));
  } catch (err) {
    fail('R7', `the shipping allowedRoutesOf and allowedRoutesFor threw over a launch-shaped store: ${String(err?.message ?? err)}`);
    return;
  }
  const phone = { id: 'p33312-phone', label: 'a launch phone', signingKey: 'p33312-signing', exchangeKey: 'p33312-exchange', clientKey: 'p33312-client', pushToken: '', pushEnvironment: '' };
  const fieldsWith = (routes) => ({ funnelProgram: store.tailnetFacts.funnelProgram, tailnet: store.tailnetFacts.tailnet, publicName: store.tailnetFacts.publicName, publicPort: store.publicPort, bindAtLaunch: store.bindAtLaunch, routes, phones: [phone], pushAlerts: store.pushAlerts });
  for (const set of sets) {
    const frozen = (set.wire?.routes ?? []).map((r) => r.id);
    if (frozen.length === 0) continue;
    const later = frozen.filter((id) => !legacy.includes(id));
    if (later.length > 0) {
      note('R7', `${set.name}: it calls ${later.join(', ')}, which no 0.111.x Mac answered, so no store a 0.111.x Mac wrote was ever paired with it; its store shape is not compared`);
      continue;
    }
    checked('R7');
    if (sorted(allowed) !== sorted(frozen)) {
      fail('R7', `${set.name}: a store as a 0.111.x Mac writes it (no allowedRoutes) allows ${sorted(allowed)}, not the frozen ${sorted(frozen)}. After the update every phone that store paired reads changed and goes dark until Allow`);
      continue;
    }
    checked('R7');
    let mine;
    let theirs;
    try {
      mine = pairing.pocketExecutionHash(fieldsWith(allowed));
      theirs = pairing.pocketExecutionHash(fieldsWith(frozen));
    } catch (err) {
      fail('R7', `${set.name}: the shipping pocketExecutionHash threw: ${String(err?.message ?? err)}`);
      continue;
    }
    if (mine !== theirs) fail('R7', `${set.name}: the hash over what a launch store allows is ${String(mine).slice(0, 12)}…, not the ${String(theirs).slice(0, 12)}… over the frozen routes: the record a stranger confirmed would read changed`);
    let served = [];
    try {
      served = allowedMod.servedRoutesOf(allowed, routesMod.pocketRouteIds());
    } catch (err) {
      fail('R7', `${set.name}: the shipping servedRoutesOf threw: ${String(err?.message ?? err)}`);
    }
    for (const id of frozen) {
      checked('R7');
      if (!served.includes(id)) fail('R7', `${set.name}: ${id} is not served by the door a launch store sets up, so every old phone's request on it is refused route`);
    }
  }
}

/**
 * R8, THE ROUTE LEDGER ONLY ADDS (Phase 333.12, build/p33312/SPEC.md §6.3,
 * D12). An allowed id keeps its meaning for as long as a Tortie knows it, so
 * a row of any committed ledger is a row of today's, unchanged; and the routes
 * the launch phone was frozen calling are ledger rows with their frozen
 * method, path, signing, window and reads.
 */
/** `--ledger-copy <file>`: one more copy of the ledger to compare, under ROOT (the ablation's planted older copy). */
const LEDGER_COPIES = argv.flatMap((a, i) => (a === '--ledger-copy' && argv[i + 1] !== undefined ? [argv[i + 1]] : []));

/** The rows a copy of the ledger holds, read with the parser: `{ rows }`, or `{ error }`. Pure. */
function ledgerRowsOf(text) {
  const sf = ts.createSourceFile('route-ledger.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const decl = constDecl(sf, 'POCKET_ROUTE_LEDGER');
  if (decl === null) return { error: 'it declares no POCKET_ROUTE_LEDGER' };
  let init = decl.initializer ?? null;
  const strip = (e) => {
    let n = e;
    while (n !== null && n !== undefined && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isSatisfiesExpression?.(n))) n = n.expression;
    return n ?? null;
  };
  init = strip(init);
  if (init !== null && ts.isCallExpression(init) && init.expression.getText(sf) === 'Object.freeze') init = strip(init.arguments[0]);
  if (init === null || !ts.isArrayLiteralExpression(init)) return { error: 'its POCKET_ROUTE_LEDGER is not a literal array' };
  const rows = [];
  for (const el of init.elements) {
    if (!ts.isObjectLiteralExpression(el)) return { error: `a row is not an object literal (${el.getText(sf).slice(0, 60)})` };
    const row = {};
    for (const p of el.properties) {
      if (!ts.isPropertyAssignment(p) || !(ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) return { error: `a row holds ${p.getText(sf).slice(0, 60)}, not a literal field` };
      const v = p.initializer;
      if (ts.isStringLiteralLike(v)) row[p.name.text] = v.text;
      else if (ts.isNumericLiteral(v)) row[p.name.text] = Number(v.text.replace(/_/g, ''));
      else if (v.kind === ts.SyntaxKind.TrueKeyword) row[p.name.text] = true;
      else if (v.kind === ts.SyntaxKind.FalseKeyword) row[p.name.text] = false;
      else if (v.kind === ts.SyntaxKind.NullKeyword) row[p.name.text] = null;
      else return { error: `${String(row.id ?? 'a row')}'s ${p.name.text} is ${v.getText(sf).slice(0, 40)}, not a literal` };
    }
    rows.push(row);
  }
  return { rows };
}

/**
 * THE ONE PURE COMPARISON (R8): what `next` lost of `previous`, as sentences.
 * A row of the earlier ledger that is gone, or whose any field moved, or an id
 * the later one names twice. An added row is not a loss.
 */
function ledgerLosses(previous, next) {
  const out = [];
  const seen = new Set();
  for (const row of next) {
    if (seen.has(row.id)) out.push(`${String(row.id)} is named twice`);
    seen.add(row.id);
  }
  for (const row of previous) {
    const now = next.find((r) => r.id === row.id);
    if (now === undefined) {
      out.push(`the row ${String(row.id)} is gone`);
      continue;
    }
    for (const k of [...new Set([...Object.keys(row), ...Object.keys(now)])].sort()) {
      if (reader.canonical(row[k]) !== reader.canonical(now[k])) out.push(`${String(row.id)}'s ${k} was ${JSON.stringify(row[k])} and is ${JSON.stringify(now[k])}`);
    }
  }
  return out;
}

function clauseR8(sets) {
  expects('R8');
  const path = join(ROOT, LEDGER_REL);
  checked('R8');
  if (!existsSync(path)) {
    fail('R8', `${LEDGER_REL} does not exist, so no route's meaning is written down`);
    return;
  }
  const today = ledgerRowsOf(readFileSync(path, 'utf8'));
  if (today.error !== undefined) {
    fail('R8', `${LEDGER_REL}: ${today.error}`);
    return;
  }
  checked('R8');
  for (const loss of ledgerLosses([], today.rows)) fail('R8', `${LEDGER_REL}: ${loss}`);
  // The frozen half: every route the frozen phone calls is a ledger row as it was frozen.
  for (const set of sets) {
    for (const fr of set.wire?.routes ?? []) {
      checked('R8');
      const row = today.rows.find((r) => r.id === fr.id);
      if (row === undefined) {
        fail('R8', `${set.name}: ${fr.id} (${fr.method} ${fr.path}) has no row in ${LEDGER_REL}, so what the launch phone allowed has no meaning written down`);
        continue;
      }
      for (const k of ['method', 'path', 'signed', 'windowOnly', 'reads']) {
        if (row[k] !== fr[k]) fail('R8', `${set.name}: ${fr.id}'s ${k} is ${JSON.stringify(row[k])} in the ledger and ${JSON.stringify(fr[k])} when frozen. An allowed id never changes meaning; a route that must change takes a new id`);
      }
    }
  }
  // A planted copy (--ledger-copy), compared exactly as a committed one.
  for (const rel of LEDGER_COPIES) {
    const at = resolve(ROOT, rel);
    checked('R8');
    if (!existsSync(at)) {
      fail('R8', `--ledger-copy ${rel} does not exist`);
      continue;
    }
    const copy = ledgerRowsOf(readFileSync(at, 'utf8'));
    if (copy.error !== undefined) fail('R8', `--ledger-copy ${rel}: ${copy.error}`);
    else for (const loss of ledgerLosses(copy.rows, today.rows)) fail('R8', `against the copy ${rel}: ${loss}. A ledger row is never edited or removed, only appended`);
  }
  // Every committed copy, read only, from the same four git reads F1's
  // copies come from (committedHistory: one log, one ls-tree and one
  // cat-file for both), one comparison per distinct blob.
  const h = committedHistory();
  if (h.why !== null) {
    note('R8', `${h.why}: committed copies of the ledger not compared`);
    return;
  }
  if (h.shallow) note('R8', 'a shallow clone: only the ledger copies after its graft');
  for (const n of h.notes.r8) note('R8', n);
  if (h.ledger.size === 0) {
    note('R8', `no committed copy of ${LEDGER_REL} yet, so its history was not compared (true until Phase 333.12 lands)`);
    return;
  }
  for (const [blob, where] of h.ledger) {
    const bytes = h.blobs.get(blob);
    // A blob git did not answer is already a note (committedHistory).
    if (bytes === undefined) continue;
    const at = where.commit.slice(0, 8);
    const copy = ledgerRowsOf(bytes.toString('utf8'));
    checked('R8');
    if (copy.error !== undefined) {
      fail('R8', `its copy committed at ${at} cannot be read as a ledger (${copy.error}), so what an id meant then is not known`);
      continue;
    }
    for (const loss of ledgerLosses(copy.rows, today.rows)) fail('R8', `against its copy committed at ${at}: ${loss}. A ledger row is never edited or removed, only appended`);
  }
}

function clauseR6(sets) {
  for (const set of sets) {
    const v = set.vectors;
    if (v === null || set.wire === null) continue;
    expects('R6');
    if (pairing.loadError !== undefined) {
      fail('R6', pairing.loadError);
      return;
    }
    const k = v.keys;
    const id = v.identity;
    const checks = [
      ['phoneIdOf', () => pairing.phoneIdOf(k.phoneSigningKey), id.phoneId],
      ['pairFingerprint', () => pairing.pairFingerprint(k.phoneSigningKey, k.phoneExchangeKey, k.clientKey), id.fingerprint],
      ['pairingBinding', () => {
        const { mac, phone } = frozenParties(v);
        return pairing.pairingBinding(mac, phone);
      }, id.binding],
      ['clientKeyPinOf', () => pairing.clientKeyPinOf(k.clientKey), id.clientPin],
      ...(v.pins ?? []).map((p) => [`spkiPinOf(${String(p.name)})`, () => pairing.spkiPinOf(p.publicKeyFingerprint), p.pin])
    ];
    for (const [name, compute, want] of checks) {
      checked('R6');
      let got;
      try {
        got = compute();
      } catch (err) {
        got = `threw ${String(err.message)}`;
      }
      if (got !== want) fail('R6', `${set.name}: the shipping ${name} computes ${String(got).slice(0, 48)}, not the ${String(want).slice(0, 48)} the old phone computed`);
    }
  }
}

/** Types reached from each instance's root through REQUIRED, non-null keys with a value (A1 b). */
function reachedTypes(wire, instances, requiredOnly) {
  const reached = new Set();
  const walk = (v, kind) => {
    if (kind?.array !== undefined) {
      if (Array.isArray(v)) for (const e of v) walk(e, kind.array);
      return;
    }
    const name = kind?.type;
    if (name === undefined || v === null || typeof v !== 'object') return;
    reached.add(name);
    for (const { owner, key, f } of fieldsFor(wire, name, v)) {
      reached.add(owner);
      if (f.presence === 'absent' || !Object.hasOwn(v, key) || v[key] === null) continue;
      if (requiredOnly && (f.presence !== 'required' || f.null)) continue;
      walk(v[key], f.kind);
    }
  };
  for (const inst of instances.values()) {
    const root = rootTypeOf(wire, inst.route);
    if (root === null) continue;
    try {
      walk(JSON.parse(inst.text), { type: root });
    } catch {
      /* A2 names a broken instance */
    }
  }
  return reached;
}

function clauseA(sets, todayVectors, stats) {
  const todayInstances = instancesOf(todayVectors);
  for (const set of sets) {
    const w = set.wire;
    if (w === null || set.vectors === null) continue;
    const frozenInstances = instancesOf(set.vectors);
    // A1 (a): every frozen route that had an instance still has one.
    const frozenRoutes = [...new Set([...frozenInstances.values()].map((i) => i.route))].sort();
    for (const route of frozenRoutes) {
      expects('A1');
      checked('A1');
      if (![...todayInstances.values()].some((i) => i.route === route)) fail('A1', `${route}: the frozen vectors hold an answer to it and today's vectors hold none, so nothing shows a new Mac still answers it the way the old phone reads`);
    }
    // A1 (b): every type reached through required keys is still reached.
    const fr = reachedTypes(w, frozenInstances, true);
    const tr = reachedTypes(w, new Map([...todayInstances].filter(([, i]) => i.route === 'qr' || (w.routes ?? []).some((r) => r.id === i.route))), true);
    for (const t of [...fr].sort()) {
      checked('A1');
      if (!tr.has(t)) fail('A1', `${t}: the frozen vectors reach it through required keys and today's do not`);
    }
    const fAny = reachedTypes(w, frozenInstances, false);
    const tAny = reachedTypes(w, todayInstances, false);
    for (const t of [...fAny].sort()) if (!fr.has(t) && !tAny.has(t)) note('A1', `${t}: no instance in today's vectors (reached only through an optional key): A3 alone holds it now`);
    // A2: every instance of a frozen route in today's vectors conforms.
    for (const [id, inst] of todayInstances) {
      if (inst.route !== 'qr' && !(w.routes ?? []).some((r) => r.id === inst.route)) continue;
      expects('A2');
      checked('A2');
      stats.instances += 1;
      stats.routes.add(inst.route);
      const out = [];
      conformInstance(w, id, inst, inst.text, out, stats);
      if (typeof inst.unknownText === 'string') conformInstance(w, `${id}+unknown`, inst, inst.unknownText, out, stats);
      for (const o of out) fail('A2', `${set.name}: ${o}`);
    }
  }
}

function clauseA3(sets) {
  for (const set of sets) {
    if (set.wire === null) continue;
    expects('A3');
    const findings = [];
    const counts = { routes: 0, paths: 0, words: 0 };
    try {
      tsChecks(set.wire, findings, counts);
    } catch (err) {
      findings.push(`the Mac's types could not be walked: ${String(err.message)}`);
    }
    checked('A3', counts.paths);
    if (counts.routes === 0) fail('A3', `${set.name}: no frozen route's TypeScript answer type was found`);
    for (const f of findings) fail('A3', `${set.name}: ${f}`);
  }
}

/** The rules by which a bound holds a Mac constant; `instance<=phone` rows hold the vectors alone and keep an empty list. */
const MAC_HELD_RULES = ['mac<=phone', 'mac<phone*1000', 'equal', 'mac-in-phone'];

/**
 * A4 (SPEC-1 D10, §4.7). Every bound whose rule names the Mac must list at
 * least one Mac constant in the sealed set, so emptying a list and resealing
 * is red; and the constants checked are the sealed list joined with the
 * reader's own BOUND_ROWS list for the same phone constant, so the emptied
 * list is held anyway. The phone value is the SMALLER of the sealed one and
 * today's for `<=` and `<`, both for `equal`, and their intersection for
 * `mac-in-phone`, so a resealed phone value cannot loosen it either.
 *
 * The fix round (the reverify's W20 and W21): the RULE and the FILE come
 * from the reader's own BOUND_ROWS as well as from the seal. A bound the
 * reader holds against the Mac is held by the reader's rule whatever rule
 * the sealed row names, and by the sealed rule too when that one names the
 * Mac, so `mac<=phone` resealed as `instance<=phone` still holds the Mac; and
 * every constant the reader names is read from the reader's file, never from
 * a sealed `macFile` that may point at a decoy (a constant only the seal
 * names is read from the file the gate's own tables name, else the sealed
 * one). A sealed rule that differs from the reader's is a note, never red
 * here: F1 (b) holds the rule to every committed copy. A Mac-held bound the
 * reader names and the sealed set lacks (resealed under another name, say)
 * is held at today's value, with a note.
 */
function clauseA4(sets, today) {
  const todayOf = (phone) => (today.bounds ?? []).find((b) => b.phone === phone)?.value ?? null;
  /** Hold every constant to `value` (and today's `t`) by every rule. */
  const hold = (phone, rules, constants, value, t) => {
    for (const { mac, file } of constants) {
      expects('A4');
      checked('A4');
      if (typeof file !== 'string') {
        fail('A4', `${mac}: the bound ${String(phone)} names no Mac file to read it from`);
        continue;
      }
      const now = macConstant(file, mac);
      if (now.error !== undefined) {
        fail('A4', `${mac}: ${now.error}`);
        continue;
      }
      const x = now.value;
      const bound = typeof t === 'number' && typeof value === 'number' ? Math.min(value, t) : value;
      const which = typeof t === 'number' && t < value ? `today's ${String(t)}` : String(value);
      for (const rule of rules) {
        if (rule === 'mac<=phone' && !(typeof x === 'number' && typeof bound === 'number' && x <= bound)) fail('A4', `${mac} is ${String(x)}, past ${phone} (${which}): every old phone refuses what it composes at that size`);
        if (rule === 'mac<phone*1000' && !(typeof x === 'number' && typeof bound === 'number' && x < bound * 1000)) fail('A4', `${mac} is ${String(x)} ms, not under ${phone} (${which} s): an old phone gives up before the answer`);
        if (rule === 'equal' && (x !== value || (t !== null && x !== t))) fail('A4', `${mac} is ${JSON.stringify(x)}, not the ${JSON.stringify(value)} the frozen phone reads${t !== null && t !== value ? ` and the ${JSON.stringify(t)} today's reads` : ''} (${phone})`);
        if (rule === 'mac-in-phone') {
          const dialed = Array.isArray(value) ? value.filter((p) => !Array.isArray(t) || t.includes(p)) : [];
          if (!(Array.isArray(x) && x.every((p) => dialed.includes(p)))) fail('A4', `${mac} is ${JSON.stringify(x)}, and the frozen phone and today's both dial only ${JSON.stringify(dialed)}`);
        }
      }
    }
  };
  for (const set of sets) {
    const bounds = (set.wire?.bounds ?? []).filter(isPlainObject);
    for (const row of bounds) {
      const own = reader.BOUND_ROWS.find((b) => b.phone === row.phone);
      const sealedHeld = MAC_HELD_RULES.includes(row.rule);
      const ownHeld = own !== undefined && MAC_HELD_RULES.includes(own.rule);
      if (!sealedHeld && !ownHeld) continue;
      expects('A4');
      checked('A4');
      const sealed = Array.isArray(row.mac) ? row.mac : [];
      if (sealedHeld && sealed.length === 0) fail('A4', `${String(row.phone)}'s Mac list is empty in the sealed set: nothing holds a Mac constant to this bound`);
      if (ownHeld && row.rule !== own.rule) note('A4', `${set.name}: the sealed set holds ${String(row.phone)} by ${String(row.rule)} and the reader's BOUND_ROWS by ${own.rule}; ${sealedHeld ? 'both are applied' : `${own.rule} is applied`}`);
      const rules = [...new Set([...(sealedHeld ? [row.rule] : []), ...(ownHeld ? [own.rule] : [])])];
      const ownList = ownHeld ? own.mac : [];
      const constants = [...new Set([...sealed, ...ownList])].map((mac) => ({ mac, file: ownList.includes(mac) ? own.macFile : (gateFileOf(mac) ?? row.macFile ?? own?.macFile ?? null) }));
      hold(row.phone, rules, constants, row.value, todayOf(row.phone));
    }
    // A Mac-held bound the reader names that the sealed set does not (a set
    // frozen before the reader knew it, or a row resealed under another
    // name): held at today's value by the reader's own rule and file, so a
    // renamed row does not take the Mac out of A4 either. A note, never red
    // for the absence itself; F1 (b) holds the name to every committed copy.
    for (const own of reader.BOUND_ROWS) {
      if (!MAC_HELD_RULES.includes(own.rule) || bounds.some((b) => b.phone === own.phone)) continue;
      const t = todayOf(own.phone);
      if (t === null) {
        note('A4', `${set.name}: the sealed set holds no bound ${own.phone}, and today's phone was not read for it (P0 names why)`);
        continue;
      }
      note('A4', `${set.name}: the sealed set holds no bound ${own.phone}; the reader's is held at today's ${JSON.stringify(t)}`);
      expects('A4');
      checked('A4');
      hold(own.phone, [own.rule], own.mac.map((mac) => ({ mac, file: own.macFile })), t, t);
    }
  }
}

function clauseA5(sets) {
  const statuses = [...new Set(sets.flatMap((s) => s.wire?.statuses ?? []))];
  if (sets.length === 0) return;
  expects('A5');
  // Every status a frozen phone reads: the INTERSECTION, so no phone is answered one it does not read.
  const readByAll = statuses.filter((x) => sets.every((s) => (s.wire?.statuses ?? []).includes(x)));
  const unionOf = (typeNode, sf, where) => {
    const out = [];
    const collect = (n) => {
      if (ts.isUnionTypeNode(n)) n.types.forEach(collect);
      else if (ts.isLiteralTypeNode(n) && ts.isNumericLiteral(n.literal)) out.push(Number(n.literal.text));
      else out.push(`\`${n.getText(sf)}\``);
    };
    collect(typeNode);
    checked('A5');
    const bad = out.filter((x) => typeof x !== 'number' || !readByAll.includes(x));
    if (bad.length > 0) fail('A5', `${where}: status ${bad.join(' | ')}, and the frozen phone reads only ${readByAll.join(', ')}`);
  };
  const bind = astOf(join(ROOT, 'src', 'main', 'pocket', 'bind.ts'));
  const answerIf = bind?.statements.find((s) => ts.isInterfaceDeclaration(s) && s.name.text === 'DoorAnswer');
  const statusProp = answerIf?.members.find((m) => ts.isPropertySignature(m) && m.name.getText(bind) === 'status');
  if (statusProp?.type === undefined) fail('A5', "src/main/pocket/bind.ts: DoorAnswer's status cannot be read");
  else unionOf(statusProp.type, bind, 'src/main/pocket/bind.ts DoorAnswer');
  const wire = astOf(join(ROOT, 'src', 'main', 'pocket', 'door', 'wire.ts'));
  const toDoor = wire?.statements.find((s) => ts.isTypeAliasDeclaration(s) && s.name.text === 'ToDoor');
  let found = 0;
  if (toDoor !== undefined) {
    eachNode(toDoor.type, (n) => {
      if (ts.isPropertySignature(n) && n.name.getText(wire) === 'status' && n.type !== undefined) {
        found += 1;
        unionOf(n.type, wire, 'src/main/pocket/door/wire.ts ToDoor');
      }
    });
  }
  if (found === 0) fail('A5', "src/main/pocket/door/wire.ts: the wire answer's status cannot be read");
  const doorDir = join(ROOT, 'src', 'main', 'pocket', 'door');
  const files = existsSync(doorDir) ? readdirSync(doorDir).filter((n) => n.endsWith('.ts')).sort() : [];
  let calls = 0;
  for (const name of files) {
    const sf = astOf(join(doorDir, name));
    eachNode(sf, (n) => {
      if (!ts.isCallExpression(n) || n.expression.getText(sf) !== 'sendPocket') return;
      calls += 1;
      checked('A5');
      const arg = n.arguments[1];
      const line = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      if (arg !== undefined && ts.isNumericLiteral(arg)) {
        if (!readByAll.includes(Number(arg.text))) fail('A5', `src/main/pocket/door/${name}:${String(line)}: sendPocket answers ${arg.text}, and the frozen phone reads only ${readByAll.join(', ')}`);
      } else if (!(arg !== undefined && ts.isPropertyAccessExpression(arg) && arg.name.text === 'status')) {
        fail('A5', `src/main/pocket/door/${name}:${String(line)}: sendPocket answers \`${arg?.getText(sf) ?? '?'}\`, neither a status literal nor the answer's typed status`);
      }
    });
  }
  if (calls === 0) fail('A5', 'no sendPocket( call under src/main/pocket/door/ was found');
}

function clauseP(sets, today) {
  expects('P0');
  checked('P0');
  for (const u of today.unread) fail('P0', `${u.file === '' ? '' : `${u.file}:${String(u.line)}: `}${u.why}`);
  const todayProjection = reader.projection(today);
  const p4 = [];
  for (const set of sets) {
    const w = set.wire;
    if (w === null) continue;
    // P0's consistency: the same phone bytes must read the same way.
    const phoneFiles = Object.entries(w.read ?? {}).filter(([path]) => path.startsWith('ios/'));
    const same = phoneFiles.length > 0 && phoneFiles.every(([path, hash]) => existsSync(join(ROOT, path)) && sha256hex(readFileSync(join(ROOT, path))) === hash);
    const equal = reader.projection(w) === todayProjection;
    checked('P0');
    if (same && !equal) {
      const d = reader.differingPaths(w, today, 10);
      fail('P0', `${set.name}: every phone file it read is byte-identical today, and today's reading differs from the frozen one at ${String(d.count)} path(s): ${d.paths.join(', ')}. Either the reader reads the same bytes two ways or the frozen file is not what --freeze wrote; the phone did not move`);
    }
    // P1, P2.
    expects('P1');
    expects('P2');
    const findings = { p1: [], p2: [], notes: [], pairs: 0 };
    comparePhones(w, today, findings);
    checked('P1', findings.pairs);
    checked('P2', findings.pairs);
    for (const f of findings.p1) fail('P1', `${set.name}: ${f}`);
    for (const f of findings.p2) fail('P2', `${set.name}: ${f}`);
    for (const n of findings.notes) note('P2', `${set.name}: ${n}`);
    // P3.
    for (const row of w.bounds ?? []) {
      expects('P3');
      checked('P3');
      const t = today.bounds.find((b) => b.phone === row.phone);
      if (t === undefined || t.value === null) {
        fail('P3', `${set.name}: today's phone has no ${row.phone}`);
        continue;
      }
      if (row.rule === 'equal' && t.value !== row.value) fail('P3', `${set.name}: ${row.phone} is ${JSON.stringify(t.value)} today, ${JSON.stringify(row.value)} when frozen`);
      else if (row.rule === 'mac-in-phone' && !(Array.isArray(t.value) && row.value.every((x) => t.value.includes(x)))) fail('P3', `${set.name}: ${row.phone} is ${JSON.stringify(t.value)} today and no longer holds all of ${JSON.stringify(row.value)}`);
      else if (!['equal', 'mac-in-phone'].includes(row.rule) && !(typeof t.value === 'number' && t.value >= row.value)) fail('P3', `${set.name}: ${row.phone} is ${String(t.value)} today, below the ${String(row.value)} it was frozen at`);
    }
    checked('P3');
    const lostStatuses = (w.statuses ?? []).filter((x) => !today.statuses.includes(x));
    if (lostStatuses.length > 0) fail('P3', `${set.name}: today's phone no longer reads status ${lostStatuses.join(', ')}`);
    // P4.
    checked('P4');
    if (equal) p4.push({ label: w.label, equal: true });
    else {
      const d = reader.differingPaths(w, today, 10);
      p4.push({ label: w.label, equal: false, count: d.count, paths: d.paths });
    }
  }
  return p4;
}

// ---------------------------------------------------------------------------
// The freeze (§9)
// ---------------------------------------------------------------------------

function pretty(value, indent = '') {
  const flat = JSON.stringify(value);
  if (flat.length + indent.length <= 140 || value === null || typeof value !== 'object') return flat;
  const inner = `${indent}  `;
  if (Array.isArray(value)) return `[\n${value.map((v) => `${inner}${pretty(v, inner)}`).join(',\n')}\n${indent}]`;
  return `{\n${Object.keys(value).map((k) => `${inner}${JSON.stringify(k)}: ${pretty(value[k], inner)}`).join(',\n')}\n${indent}}`;
}

function buildWire(label, today, vectorsBytes, previous) {
  const problems = [];
  const vectors = JSON.parse(vectorsBytes.toString('utf8'));
  const rows = tableRows();
  if (rows === null) problems.push('src/main/pocket/door/table.ts: POCKET_ROUTES cannot be read');
  const routes = [];
  for (const r of today.routes) {
    const row = (rows ?? []).find((x) => x.method === r.method && x.path === r.path);
    if (row === undefined) {
      problems.push(`the phone calls ${r.method} ${r.path}, which the door's table does not hold`);
      continue;
    }
    if (row.signed !== r.signed) problems.push(`${r.method} ${r.path}: the phone ${r.signed ? 'signs' : 'does not sign'} it and the table says signed ${String(row.signed)}`);
    routes.push({ id: row.id, method: row.method, path: row.path, signed: row.signed, windowOnly: row.windowOnly, reads: row.reads, answer: r.answer });
  }
  routes.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const notCalled = (rows ?? []).filter((x) => !routes.some((r) => r.id === x.id)).map((x) => x.id);
  // Format 2 (SPEC-1 §4.1): the request record, each entry with the id of the
  // table row of the same method and path, and the phone's own asks.
  const requests = [];
  if (!Array.isArray(today.requests)) problems.push("the reader returned no request record (requests), so the ways the phone asks cannot be frozen");
  for (const rec of Array.isArray(today.requests) ? today.requests : []) {
    const row = (rows ?? []).find((x) => x.method === rec?.method && x.path === rec?.path);
    if (row === undefined) {
      problems.push(`the phone's request record names ${String(rec?.method)} ${String(rec?.path)}, which the door's table does not hold`);
      continue;
    }
    requests.push({ route: row.id, method: rec.method, path: rec.path, query: rec.query, body: rec.body });
  }
  if (!Array.isArray(today.asks)) problems.push("the reader returned no asks, so the phone's own numbers cannot be frozen");
  const asks = (Array.isArray(today.asks) ? today.asks : []).map(({ phone, value, mac, macFile, rule, swift }) => ({ phone, value, mac, macFile, rule, swift }));
  const macLimits = MAC_LIMITS.map((row) => {
    const c = macConstant(row.file, row.mac);
    if (c.error !== undefined || typeof c.value !== 'number') problems.push(`${row.mac}: ${c.error ?? 'not a number'}`);
    return { mac: row.mac, file: row.file, value: c.value ?? null, rule: 'now>=frozen' };
  });
  const pbx = existsSync(join(ROOT, 'ios', 'Tortie.xcodeproj', 'project.pbxproj')) ? readFileSync(join(ROOT, 'ios', 'Tortie.xcodeproj', 'project.pbxproj'), 'utf8') : '';
  const uniq = (re) => [...new Set([...pbx.matchAll(re)].map((m) => m[1]))].join(',');
  let macVersion = null;
  try {
    macVersion = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version ?? null;
  } catch {
    macVersion = null;
  }
  const readHashes = { ...today.read };
  readHashes['src/main/pocket/door/table.ts'] = sha256hex(readFileSync(join(ROOT, 'src', 'main', 'pocket', 'door', 'table.ts')));
  readHashes['ios/TortieTests/Fixtures/vectors.json'] = sha256hex(vectorsBytes);
  const sortedRead = Object.fromEntries(Object.keys(readHashes).sort().map((k) => [k, readHashes[k]]));
  const draft = {
    about: aboutOf(label),
    format: FORMAT_WRITTEN,
    label,
    phoneBuild: uniq(/CURRENT_PROJECT_VERSION = ([^;]+);/g),
    phoneVersion: uniq(/MARKETING_VERSION = ([^;]+);/g),
    macVersion,
    read: sortedRead,
    vectors: { file: `${label}.vectors.json`, sha256: sha256hex(vectorsBytes) },
    routes,
    routeMembership: membershipOf(routes),
    qr: { answer: today.qr.answer },
    types: today.types,
    formats: today.formats,
    bounds: today.bounds.map(({ phone, value, applies, measure, min, mac, macFile, rule, swift }) => ({ phone, value, applies, measure, min, mac, macFile, rule, swift })),
    macLimits,
    sends: today.sends.map(({ phone, words, mac, macFile, macForm }) => ({ phone, words, mac, macFile, macForm })),
    requests,
    asks,
    statuses: today.statuses
  };
  const instances = instancesOf(vectors);
  draft.instances = Object.fromEntries([...instances].map(([id, inst]) => [id, inst.route]));
  for (const [id, route] of Object.entries(draft.instances)) {
    if (route !== 'qr' && !routes.some((r) => r.id === route)) problems.push(`${id}: its route ${route} is not a route the phone calls`);
  }
  const { arms, unarmed } = generateArms(draft, instances);
  draft.arms = arms;
  draft.unarmed = unarmed;
  draft.history = [...(previous?.history ?? [])];
  if (previous !== null) draft.history.push({ seal: previous.seal, phoneBuild: previous.phoneBuild, macVersion: previous.macVersion, why: WHY });
  draft.seal = sealOf(draft);
  return { wire: draft, problems, notCalled };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function printClauses(order) {
  let red = 0;
  for (const id of order) {
    const s = state[id];
    if (s.expects && s.checked === 0 && s.findings.length === 0) s.findings.push('checked nothing where the frozen set holds items: a scanner that stopped finding is not a clean tree');
    const ok = s.findings.length === 0;
    if (!ok && id !== 'P4') red += 1;
    process.stdout.write(`  ${ok ? 'ok  ' : 'FAIL'} ${id}  ${CLAUSES[id]} (${String(s.checked)} checked)\n`);
    for (const f of s.findings.slice(0, MAX_FINDINGS)) process.stdout.write(`         - ${f}\n`);
    if (s.findings.length > MAX_FINDINGS) process.stdout.write(`         … and ${String(s.findings.length - MAX_FINDINGS)} more\n`);
    for (const n of s.notes.slice(0, 10)) process.stdout.write(`         · ${n}\n`);
  }
  return red;
}

const t0 = performance.now();
const proof = reader.proveReader(join(REPO, 'build', 'p33311', 'fixtures'));
if (proof.problems.length > 0) {
  process.stdout.write(`${TAG} FAIL: the reader of the phone does not read its own fixtures (${String(proof.files)} read), so nothing it reads of the phone is trusted:\n`);
  for (const p of proof.problems) process.stdout.write(`  - ${p}\n`);
  if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify({ ok: false, fixtures: proof.problems })}\n`);
  process.exit(1);
}
let today;
try {
  today = reader.readPhoneWire(ROOT);
} catch (err) {
  process.stdout.write(`${TAG} FAIL: P0: the reader threw over today's phone: ${String(err?.stack ?? err)}\n`);
  if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify({ ok: false, reader: String(err?.message ?? err) })}\n`);
  process.exit(1);
}
const todayBytes = existsSync(VECTORS_PATH) ? readFileSync(VECTORS_PATH) : null;
let todayVectors = null;
try {
  todayVectors = todayBytes === null ? null : JSON.parse(todayBytes.toString('utf8'));
} catch {
  todayVectors = null;
}

let sets;
let freezeResult = null;
if (FREEZE !== null) {
  if (!/^[a-z][a-z0-9-]{0,31}$/.test(FREEZE)) {
    process.stdout.write(`${TAG} FAIL: --freeze takes a label of lowercase letters, digits and -, not ${JSON.stringify(FREEZE)}\n`);
    process.exit(1);
  }
  if (today.unread.length > 0) {
    process.stdout.write(`${TAG} FAIL: the phone has ${String(today.unread.length)} statement(s) the reader cannot read, so it cannot be frozen:\n`);
    for (const u of today.unread) process.stdout.write(`  - ${u.file === '' ? '' : `${u.file}:${String(u.line)}: `}${u.why}\n`);
    process.exit(1);
  }
  if (todayBytes === null || todayVectors === null) {
    process.stdout.write(`${TAG} FAIL: ${relPath(VECTORS_PATH)} cannot be read\n`);
    process.exit(1);
  }
  const target = join(FROZEN_DIR, `${FREEZE}.wire.json`);
  let previous = null;
  if (existsSync(target)) {
    if (!REPLACE) {
      process.stdout.write(`${TAG} FAIL: ${relPath(target)} exists. A frozen set is replaced only on purpose: --replace --why "<sentence>", and the commit names every moved line\n`);
      process.exit(1);
    }
    if (WHY === null || WHY.trim() === '' || WHY.startsWith('--')) {
      process.stdout.write(`${TAG} FAIL: --replace needs --why "<sentence>": the reason is kept in the set's history\n`);
      process.exit(1);
    }
    previous = JSON.parse(readFileSync(target, 'utf8'));
  } else if (REPLACE) {
    process.stdout.write(`${TAG} FAIL: --replace, and ${relPath(target)} does not exist\n`);
    process.exit(1);
  }
  freezeResult = buildWire(FREEZE, today, todayBytes, previous);
  if (freezeResult.problems.length > 0) {
    process.stdout.write(`${TAG} FAIL: the set cannot be frozen:\n`);
    for (const p of freezeResult.problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  // SPEC-1 D11: a re-freeze never lowers what the Mac holds for the phone.
  // Lowering a limit, shortening a bound's Mac list or dropping an ask is a
  // retirement of the set by the operator's ruling, never this flag. The fix
  // round: nor does it re-rule a bound, move a row to a file the gate does
  // not name, or take out a way the frozen phone asks (the same two asks F1
  // (b) makes of every committed copy, so the two never disagree).
  if (previous !== null) {
    // Phase 333.11.2 (SPEC-2 D8): the replaced set's own vectors, read by
    // its `vectors.file` and held to its `vectors.sha256`, so every request
    // it froze is asked of the new vectors through the same function F1 (b)
    // uses. Vectors that do not hold together cannot be compared, so the
    // replace is refused rather than taken on trust.
    const vf = previous?.vectors?.file;
    const vp = typeof vf === 'string' && vf !== '' && !vf.includes('/') && !vf.includes('\\') ? join(FROZEN_DIR, vf) : null;
    const vb = vp !== null && existsSync(vp) ? readFileSync(vp) : null;
    let previousVectors = null;
    if (vb !== null && sha256hex(vb) === previous?.vectors?.sha256) {
      try {
        const parsed = JSON.parse(vb.toString('utf8'));
        previousVectors = isPlainObject(parsed) ? parsed : null;
      } catch {
        previousVectors = null;
      }
    }
    if (previousVectors === null) {
      process.stdout.write(`${TAG} FAIL: --replace: ${FREEZE}'s own vectors do not hold together (F2), so what it froze cannot be compared; nothing was written\n`);
      process.exit(1);
    }
    const losses = [...macSideLosses(previous, freezeResult.wire), ...requestLosses(previous, freezeResult.wire, previousVectors, todayVectors)];
    if (losses.length > 0) {
      process.stdout.write(`${TAG} FAIL: --replace would lower what the Mac holds for the phone, or take out a way the phone asks, in ${FREEZE}:\n`);
      for (const l of losses) process.stdout.write(`  - ${l}\n`);
      process.stdout.write(`${TAG} nothing was written: lowering a Mac-side row or taking out a way the frozen phone asks is a retirement of the set by ruling, never a re-freeze\n`);
      process.exit(1);
    }
  }
  const others = loadSets(FROZEN_DIR).filter((s) => s.name !== `${FREEZE}.wire.json`);
  sets = [...others, { name: `${FREEZE}.wire.json`, path: target, wire: freezeResult.wire, error: null, vectorsBytes: todayBytes, vectors: todayVectors }];
} else {
  sets = loadSets(FROZEN_DIR);
}

/**
 * A clause that throws is red with what it threw, and the others still run:
 * a frozen file resealed with a section of the wrong shape must turn the
 * gate red, never crash it into saying nothing.
 */
async function guarded(clause, fn) {
  try {
    return await fn();
  } catch (err) {
    expects(clause);
    fail(clause, `threw: ${String(err?.message ?? err)}`);
    return undefined;
  }
}
await guarded('F3', () => clauseF(sets, false));
await guarded('F1', () => clauseF1Copies(sets));
if (FREEZE === null) await guarded('F4', () => clauseF4());
const usable = sets.filter((s) => s.wire !== null && s.vectors !== null);
await guarded('R1', () => clauseR1(usable));
await guarded('R2', () => clauseR2(usable));
await guarded('R3', () => clauseR3(usable));
await guarded('R4', () => clauseR4(usable, today));
await guarded('R5', () => clauseR5(usable));
await guarded('R6', () => clauseR6(usable));
await guarded('R7', () => clauseR7(usable));
await guarded('R8', () => clauseR8(usable));
const aStats = { instances: 0, routes: new Set(), fields: 0, formats: 0, bounds: 0 };
if (todayVectors === null) {
  expects('A2');
  fail('A2', `${relPath(VECTORS_PATH)} cannot be read`);
} else await guarded('A2', () => clauseA(usable, todayVectors, aStats));
await guarded('A3', () => clauseA3(usable));
await guarded('A4', () => clauseA4(usable, today));
await guarded('A5', () => clauseA5(usable));
const p4 = (await guarded('P0', () => clauseP(usable, today))) ?? [];
if (FREEZE !== null) await guarded('F4', () => clauseF4());

process.stdout.write(`${TAG} ${String(sets.length)} frozen set(s) under ${relPath(FROZEN_DIR) || '.'}; the reader proved itself on ${String(proof.files)} fixture(s) and read ${String(today.files)} Swift file(s), ${String(Object.keys(today.types).length)} type(s)\n`);
const order = Object.keys(CLAUSES);
const red = printClauses(order);
const blocking = FREEZE !== null ? order.filter((id) => id !== 'F4' && id !== 'P4' && state[id].findings.length > 0) : order.filter((id) => id !== 'P4' && state[id].findings.length > 0);
for (const p of p4) {
  process.stdout.write(
    p.equal
      ? `${TAG} P4: the phone's wire today EQUALS ${p.label}.\n`
      : `${TAG} P4: the phone's wire today DIFFERS from ${p.label} at ${String(p.count)} path(s): ${p.paths.join(', ')}\n`
  );
}
const ms = Math.round(performance.now() - t0);
const summary = {
  ok: blocking.length === 0,
  ms,
  sets: usable.map((s) => s.wire.label),
  clauses: Object.fromEntries(order.map((id) => [id, { ok: state[id].findings.length === 0, checked: state[id].checked, findings: state[id].findings.slice(0, MAX_FINDINGS) }])),
  p4,
  replays: { frozen: replayStats.frozen, generated: replayStats.generated },
  git: { copies: gitStats.copies, labels: gitStats.labels, notes: gitStats.notes }
};

if (FREEZE !== null) {
  if (blocking.length > 0) {
    process.stdout.write(`${TAG} FAIL: the set would not pass its own clauses (${blocking.join(', ')}); nothing was written\n`);
    if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify(summary)}\n`);
    process.exit(1);
  }
  const w = freezeResult.wire;
  const target = join(FROZEN_DIR, `${FREEZE}.wire.json`);
  if (REPLACE && existsSync(target)) {
    const old = JSON.parse(readFileSync(target, 'utf8'));
    const askLines = (x) => (Array.isArray(x.asks) && x.asks.length > 0 ? reader.leafLines(x.asks).map((l) => `asks${l}`) : []);
    const before = new Set([...reader.leafLines(reader.projectionOf(old)), ...reader.leafLines({ macLimits: old.macLimits ?? [] }).map((l) => `macLimits${l}`), ...askLines(old)]);
    const after = new Set([...reader.leafLines(reader.projectionOf(w)), ...reader.leafLines({ macLimits: w.macLimits }).map((l) => `macLimits${l}`), ...askLines(w)]);
    const gone = [...before].filter((l) => !after.has(l)).sort();
    const added = [...after].filter((l) => !before.has(l)).sort();
    process.stdout.write(`${TAG} --replace ${FREEZE}: ${String(gone.length + added.length)} line(s) moved. Name every one in the commit body, and why:\n`);
    for (const l of gone) process.stdout.write(`  - ${l}\n`);
    for (const l of added) process.stdout.write(`  + ${l}\n`);
  }
  mkdirSync(FROZEN_DIR, { recursive: true });
  writeFileSync(join(FROZEN_DIR, w.vectors.file), todayBytes);
  writeFileSync(target, `${pretty(w)}\n`, 'utf8');
  if (freezeResult.notCalled.length > 0) process.stdout.write(`${TAG} routes of the door's table the phone calls no target for, not frozen: ${freezeResult.notCalled.join(', ')}\n`);
  process.stdout.write(`${TAG} froze ${FREEZE}: phone build ${w.phoneBuild}, Mac ${String(w.macVersion)}, ${String(w.routes.length)} routes, ${String(Object.keys(w.types).length)} types, ${String(w.arms.length)} arms, ${String(w.unarmed.length)} unarmed (${String(ms)} ms)\n`);
  // SPEC-2 §3.6: in freeze mode "above the floor" is a reminder, not red.
  if (FROZEN_DIR === CANONICAL_FROZEN_DIR && sets.length > FROZEN_SETS_FLOOR) process.stdout.write(`${TAG} raise FROZEN_SETS_FLOOR to ${String(sets.length)} in the commit that adds ${FREEZE}\n`);
  if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify(summary)}\n`);
  process.exit(0);
}

if (blocking.length > 0) {
  process.stdout.write(`${TAG} FAIL: ${String(red)} clause(s) red (${blocking.join(', ')}) in ${String(ms)} ms\n`);
  if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify(summary)}\n`);
  process.exit(1);
}
const describe = usable.map((s) => `${s.wire.label}: phone build ${s.wire.phoneBuild}, Mac ${String(s.wire.macVersion)}`).join('; ');
const unarmed = usable.reduce((n, s) => n + (s.wire.unarmed?.length ?? 0), 0);
const limits = usable.reduce((n, s) => n + (s.wire.macLimits?.length ?? 0), 0);
const equalLine = p4.map((p) => (p.equal ? `EQUALS ${p.label}` : `DIFFERS from ${p.label} at ${String(p.count)} paths: ${p.paths.join(', ')}`)).join('; ');
process.stdout.write(`${TAG} every clause held in ${String(ms)} ms\n`);
process.stdout.write(
  `${TAG} PASS: ${String(usable.length)} frozen set${usable.length === 1 ? '' : 's'} (${describe}); ${String(state.R1.checked)} routes served, ${String(state.R2.checked)} requests replayed (${String(replayStats.frozen)} frozen, ${String(replayStats.generated)} more ways the frozen phone asks), ${String(state.R3.checked)} presentations opened, ${String(aStats.instances)} instances over ${String(aStats.routes.size)} routes conform, ${String(limits)} Mac limits held, ${String(gitStats.copies)} committed cop${gitStats.copies === 1 ? 'y' : 'ies'} compared${gitStats.notes > 0 ? ` (${String(gitStats.notes)} note${gitStats.notes === 1 ? '' : 's'} under F1)` : ''}, ${String(unarmed)} fields unarmed; the phone's wire today ${equalLine}.\n`
);
if (JSON_OUT) process.stdout.write(`GATE_ONLYADD:${JSON.stringify(summary)}\n`);
process.exit(0);
