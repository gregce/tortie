#!/usr/bin/env node
/**
 * ablation.mjs, `npm run ablation:p33311` (Phase 333.11, build/p33311/SPEC.md
 * §6.3; widened by Phase 333.11.1, build/p33311/SPEC-1.md §5). The attack
 * beside `gate:onlyadd`.
 *
 * A gate that has never been seen red proves nothing. For every clause of
 * build/assert-door-only-adds.mjs this plants the break §6.2 names in a
 * COPY-ON-WRITE CLONE of the tree (`cp -Rc`, node_modules and build/vendor
 * included), runs the gate over the clone with `--root <clone> --json`, and
 * requires the clause that owns the break to read red (others may read red
 * too). Where a break edits a Mac composer, the clone's `vectors.json` is
 * regenerated first by the clone's own `node build/p316/vectors.mjs`, because
 * the gate reads the vectors the shipping composer writes. Six CONTROLS must
 * read green, because they prove ADDING is allowed: a key the Mac adds and
 * sends, a route it adds, a key the phone reads only if present, a word in an
 * open set, a connection limit raised, and (since the fix round) a query name
 * main reads that no old phone sends. Four READER arms (X1 to X4) break
 * one rule of the clone's own `build/p33311/swift-wire.mjs` and run the
 * clone's own gate, which must refuse on the reader's fixtures before any
 * clause runs (§5.6). Four MODE checks (M1 to M4) drive §9's freeze rules.
 *
 * PHASE 333.11.1 (SPEC-1 §5) adds the plants 333.11's reverify found green:
 * V1 to V4, a read arm of main's switch that refuses a way the launch phone
 * asks (no `to`, no `since`, no `agent`, `show=active`), red on R5 now that
 * it replays every way; V9 to V12, the same narrowing in the shipping query
 * readers and write parsers, red on R2; G3 to G5, a Mac-side row lowered,
 * emptied or removed in the frozen set, RESEALED, and the Mac changed to
 * match, red on R4 or A4 (the phone's own numbers, read from the Swift) AND
 * on F1 (the committed copies), each proved on its own by `alsoRed`; G6, a
 * Mac-only cap resealed lower, red on F1 alone; G1, the same not resealed;
 * P0c, an idiom the request reader does not know; P0d, a resealed record;
 * F3e, a record that disagrees with the vectors; and X5, a request-reader
 * rule broken. Beside them, one arm for each other red condition the phase
 * adds, so none is a check that cannot fail: F1h (a hand edit that does not
 * continue the committed copy's history), F1v (a retired format), F3f (a
 * malformed ask), R2s (a frozen signature the seed does not reproduce), R2c
 * (a cross product past the ceiling) and A4d (a resealed phone value that
 * today's phone still bounds). Six more CONTROLS must read green, because the replay reaches
 * no further than the phone: the empty plant Z0; V5 to V8, an arm or reader
 * that refuses only what the launch phone never sends (no `limit`, no `show`,
 * `group` or `sort`, `show=archived`, no `keep`); and G2, a cap raised. Two
 * more MODES drive `--replace`'s refusal of a lower Mac: M5 (a cap lowered)
 * and M6 (a limit and a bound's Mac constant missing). An arm's `alsoRed`
 * clauses must read red beside its own; `edits: []` plants nothing.
 *
 * THE FIX ROUND (SPEC-1 §As built, "The fix round") adds the reverify's own
 * plants that every clause passed: A4r, a Mac-held bound resealed as
 * `instance<=phone` (W20), and A4f and R4f, a bound's and a limit's file
 * resealed to point at a decoy that still holds the old value (W21, W22),
 * and A4n, the bound resealed under another name (W20 renamed),
 * each with the Mac moved past the launch phone and each red on A4 or R4
 * AND on F1; X6, the reader counting a kept line made by a factory (W18);
 * and two more modes: M7, `--replace` refusing a set that takes out a way
 * the frozen phone asks (W16's half, which F1 (b) asks through the same
 * function once a committed copy holds a record), and M8, refusing a bound
 * re-ruled, raised, its least value lowered or a path unbounded.
 *
 * PHASE 333.11.2 (build/p33311/SPEC-2.md §5) adds the plants 333.11.1's
 * reverify found green, each with a REAL commit in the clone's own
 * repository rather than a stand-in git: R1, the frozen wire renamed
 * `launch-b.wire.json` with its `say` limit resealed lower and the Mac
 * lowered to match, committed; R2, the same with the label renamed too; and
 * V1h (the entry's V1; `V1` already names a 333.11.1 arm), the frozen
 * `odd-id` request dropped from the set's vectors, the wire repinned and
 * resealed, and main's session arm refusing that id, committed: each red on
 * F1, because a set is its LABEL and every request a committed copy's vectors
 * hold must stay. Beside them the same plants uncommitted (R1w, R2w, V1w,
 * V1w with the HEAD copy's seal appended to its history as `--replace` writes
 * it, so F1 (b) alone holds it), and the entry's controls that keep their
 * clause: R1c (the lowering without the rename, committed) red on F1, V1c
 * (the Mac change alone) red on R5, and K3 (a `lazy var` kept line) red on R4.
 * K1, K2 and K4 add a fourth kept line spelled `: DoorLine = .init(keeps:)`,
 * `DoorLine.init(keeps:)` and through `typealias KeptLine = DoorLine`, and K6
 * holds a type that holds two kept lines; each is red on P0, because the
 * reader refuses every spelling it does not count. The spec's own: F1d (two
 * sets holding one label, red on F1 and F3), F1x (the clone's own gate
 * retiring `launch` while a set still holds it), F3o (a new set beside
 * `launch` with FROZEN_SETS_FLOOR unraised, red on F3 with F1 green), and X7
 * and X8, the clone's reader no longer refusing a `keeps:` call or a held
 * holder, refused by its own `requests-unread` fixture. The gate builder's
 * own, so every red condition it adds is seen red once: F1hr (F1h's hand
 * edit under a new name, red on F1 (a) alone, because a set's copy at HEAD
 * is found by its label) and F1m (RETIRED_SETS naming a key that is not a
 * label, with no ruling). The CONTROL F1r is a retirement done right, which
 * must read green: a second set and the floor at 2 committed, then the set's
 * file removed, its label named in the clone gate's RETIRED_SETS and the
 * floor back at 1. Mode M9 drives `--replace` refusing a set whose vectors
 * would drop or change a request the replaced set's vectors hold, and M10
 * (the gate builder's own) `--replace` refusing, writing nothing, when the
 * replaced set's own vectors do not hold together.
 *
 * THE FIX ROUND (SPEC-2 §As built, "The fix round") adds the verifier's
 * kept-line spellings that every clause passed, each red on P0: K7, a kept
 * line PairedScreenDoor holds through a superclass; K8, a holder held
 * through its subclass; K9, a holder named through a typealias; K10, a
 * generic holder specialised (`GenericPair<Int>()`); K11, a holder made as
 * `LinePair.self.init()`; and K12, a second door held as `Self()` in the
 * door's own extension. X9 to X14 break each new reader rule in the clone's
 * reader (R-h, R-g, R-f past `<…>`, past `.self` and through `Self`, and R-e's
 * `nil`), each refused by the `requests-unread` fixture. The CONTROL K5n, an
 * optional DoorLine set to `nil` beside the door's three kept lines, must
 * read green, because `nil` makes no line.
 *
 * PHASE 333.12 (build/p33312/SPEC.md §6.4) adds the attack on R7 and R8, the
 * allowed set and the route ledger: R7a (`LEGACY_ALLOWED_ROUTES` without
 * `keys`, red on R7 and on R2, whose launch served set then refuses every
 * keys write), R7b (`allowedRoutesFor` answering `[]` for a store that never
 * recorded a set, red on R7 and on R5, which then answers every frozen read
 * 404), R8a (a ledger row's path moved against the frozen set), R8h (the
 * history half driven through `ledgerLosses` with a PLANTED older copy whose
 * row differs, handed to the gate by `--ledger-copy`) and R8g (a ledger row
 * edited in the clone and read against the clone's committed copy through
 * git, from the same reads F1's copies come from), and one CONTROL, R8c, a
 * twelfth ledger row appended, green: the ledger may only add. Joined with
 * Phase 333.11.2, the clone is a repository of its own, so R8gh is a HISTORY
 * arm: a ledger row edited and COMMITTED, so the working ledger equals the
 * copy at HEAD and only the base commit's copy holds it, red on R8 because
 * R8 reads every committed copy and not only HEAD's. R8g and R8gh print `not
 * run: no committed copy of the ledger` and count as neither a pass nor a
 * fail when the tree holds no ledger to commit. An arm's `args` are handed to
 * the gate after `--json`, and a `create` may be a function of the clone's
 * directory.
 *
 * `git` IS REQUIRED, and the clone is a repository of ITS OWN (SPEC-2 D11).
 * After the copy (and `--into`), the clone's own copy of `.git` is removed:
 * a worktree's FILE, which reaches the operator's history, or (since the fix
 * round) a checkout's or a `git clone`'s DIRECTORY, which `cp -Rc` copied
 * whole, so removing it touches nothing of the original; only as `.git`
 * directly inside this run's own `ablation-<pid>` directory, and a link is
 * removed, never followed. Then `git init -b p33311`, `git add -A` and one
 * commit make BASE, with no global or system configuration, no hooks, no
 * signing and a made-up author. Every arm is judged against that history,
 * and nothing reaches the worktree's. A HISTORY arm (`commit: [edits]`)
 * plants and commits those edits as a second commit, plants its own edits
 * uncommitted, and is put back with `git reset --hard BASE` and `git clean
 * -fdq` (never `-x`, which would remove node_modules), then `git status
 * --porcelain` must be empty and HEAD must be BASE, or the run stops. With no
 * `git` the run fails here, never passes.
 *
 * Between plain arms every planted file is put back and its sha256 compared
 * with the original, so no arm sees another's plant, and `git status
 * --porcelain` is read once after the last arm and mode. The clone is removed
 * in a `finally`, whatever happened (and only a clone this run made: an
 * `ablation-<pid>` already there stops the run before the copy). Every
 * process it starts it waits for (`spawnSync`), so nothing outlives it.
 *
 *   node build/p33311/ablation.mjs [--scratch <dir>] [--into <dir>] [--only id,id]
 *
 * `--scratch` is where the clone is made (default: the OS temporary
 * directory, or `P33311_SCRATCH`); `--into` copies a directory of frozen sets
 * into the clone's `ios/TortieTests/Fixtures/frozen/` first (a builder's
 * scratch set before the integrator freezes); `--only` runs the named arms.
 * It prints one line per arm and `ABLATION_P33311: <red>/<arms> red,
 * <green>/<controls> controls green` (109 arms and 15 controls, and modes M1
 * to M10, since Phase 333.12 joined Phase 333.11.2's fix round; R8g and R8gh
 * among the arms, or `not run` when the tree holds no route ledger); any arm
 * that does not read as it must exits 1.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonical } from './swift-wire.mjs';

const HERE = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(HERE), '..', '..');
const TAG = '[ablation:p33311]';
const argv = process.argv.slice(2);
const valueOf = (flag) => {
  const at = argv.indexOf(flag);
  return at === -1 ? null : (argv[at + 1] ?? null);
};
const SCRATCH = resolve(valueOf('--scratch') ?? process.env.P33311_SCRATCH ?? join(tmpdir(), 'p33311-ablation'));
const INTO = valueOf('--into') === null ? null : resolve(valueOf('--into'));
const ONLY = valueOf('--only') === null ? null : new Set(valueOf('--only').split(','));
const CLONE = join(SCRATCH, `ablation-${String(process.pid)}`);
const GATE = join(REPO, 'build', 'assert-door-only-adds.mjs');
const FROZEN = 'ios/TortieTests/Fixtures/frozen';
const WIRE = `${FROZEN}/launch.wire.json`;
const VECTORS = 'ios/TortieTests/Fixtures/vectors.json';
/** A file the clone does not have, planted to hold an old value (A4f, R4f). */
const DECOY = 'p33311-decoy.ts';
/** The clone gate's own copy, which `own` arms plant into (F1x, F1m, F1r). */
const OWN_GATE = 'build/assert-door-only-adds.mjs';
/**
 * The gate's FROZEN_SETS_FLOOR as committed, which F1r raises by one and puts
 * back: the floor moves with every set a release freezes (2 since 0.112.0's
 * build-11), so the control reads it rather than spelling it.
 */
const FLOOR_LINE = (n) => `const FROZEN_SETS_FLOOR = ${String(n)};`;
const FLOOR_NOW = (() => {
  const m = /^const FROZEN_SETS_FLOOR = (\d+);$/m.exec(readFileSync(GATE, 'utf8'));
  if (m === null) throw new Error(`${GATE} holds no FROZEN_SETS_FLOOR line`);
  return Number(m[1]);
})();
const APP = 'ios/Tortie/App/TortieApp.swift';
/** PairedScreenDoor's third kept line, and the line a K arm adds after it. */
const SIDE = '    private let side = DoorLine(keeps: true)\n';
const DOOR = 'final class PairedScreenDoor: ScreenDoor {\n';
const SESSION = { file: 'src/main/pocket/ipc.ts', find: 'return id === null ? null : await routes.session(id);', to: 'return id === null || !/^[0-9a-f-]+$/.test(id) ? null : await routes.session(id);' };
/** The route ledger's end row given another clause (R8g, R8gh, Phase 333.12): an edit, never an append. */
const LEDGER_END_CLAUSE = { file: 'src/main/pocket/route-ledger.ts', find: "clause: 'end a session'", to: "clause: 'end any session'" };

/**
 * `git` in the clone, which is a repository of its own (SPEC-2 §5.1): no
 * global or system configuration, no prompt, none of the variables a git
 * hook hands a build, no hooks, no signing and a made-up author, so nothing
 * reads the operator's settings and nothing reaches his history.
 */
const CLONE_GIT_ENV = (() => {
  const env = { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' };
  for (const k of ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_ALTERNATE_OBJECT_DIRECTORIES']) delete env[k];
  return env;
})();
const CLONE_GIT_FLAGS = ['-c', 'user.name=p33311', '-c', 'user.email=p33311@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null'];
/** One git command in the clone; throws why it failed. */
function cloneGit(...args) {
  const run = spawnSync('git', [...CLONE_GIT_FLAGS, '-C', CLONE, ...args], { encoding: 'utf8', timeout: 120_000, maxBuffer: 64 * 1024 * 1024, env: CLONE_GIT_ENV });
  if (run.error !== undefined) throw new Error(`git ${args[0]} could not run in the clone (${String(run.error.code ?? run.error.message)}): the ablation needs git`);
  if (run.status !== 0) throw new Error(`git ${args.join(' ')} exited ${String(run.status)} in the clone: ${String(run.stderr).trim().split('\n')[0]}`);
  return String(run.stdout).trim();
}
/** The clone's one base commit, set once the clone is a repository. */
let BASE = null;
/** A history arm's restore: back to BASE, nothing untracked, or the run stops. */
function resetToBase() {
  cloneGit('reset', '-q', '--hard', BASE);
  cloneGit('clean', '-fdq');
  const status = cloneGit('status', '--porcelain');
  const head = cloneGit('rev-parse', 'HEAD');
  if (status !== '' || head !== BASE) throw new Error(`the clone did not return to its base commit (HEAD ${head.slice(0, 8)}, ${status === '' ? 'clean' : `status: ${status.split('\n').slice(0, 3).join(' | ')}`}), so the run stops`);
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** The seal the gate checks (F1), recomputed for an arm that reseals on purpose. */
const reseal = (wire) => {
  const { seal: _old, ...body } = wire;
  void _old;
  return { ...wire, seal: sha256(canonical(body)) };
};

/**
 * Each edit is one of: `{ file, find, to }` (a string that must match exactly
 * once), `{ file, re, to }` (a pattern that must match exactly once),
 * `{ file, remove: true }`, `{ file, create: text }` (a file the clone does
 * not have; the restore removes it), `{ file, json: (value) => value }` and
 * `{ file, bytes: (text) => text }`; `edits: []` plants nothing (Z0). Since
 * Phase 333.11.2, `{ file, renameTo }` (the restore puts `file` back and
 * removes `renameTo`) and `{ file, from, json? }` (`from` copied to a `file`
 * the clone does not have, optionally transformed; the restore removes it).
 * `regen` regenerates the clone's vectors after the plant. `alsoGreen` names
 * clauses that must stay green, `alsoRed` clauses that must read red beside
 * the arm's own (Phase 333.11.1: each of the two holds the plant alone).
 * A reader arm's `fixture` names the fixture whose proof must refuse it.
 * `commit: [edits]` makes a HISTORY arm: those edits are planted and
 * committed in the clone's own repository first (SPEC-2 §5.2), and the arm is
 * put back by a reset to BASE; `own: true` judges it with the clone's own gate.
 */

/** A frozen set's `macLimits` row, by its Mac constant. */
const limitRow = (w, mac) => w.macLimits.find((r) => r.mac === mac);
/** A frozen set's request record, by its route id. */
const recordOf = (w, route) => w.requests.find((r) => r.route === route);
/** The `say` cap resealed at 16,384 in the wire, and the Mac lowered to match (G6, R1c). */
const SAY_LOWER = [
  { file: WIRE, json: (w) => (limitRow(w, 'POCKET_WRITE_BODY_CAPS.say').value = 16384, reseal(w)) },
  { file: 'src/main/pocket/door/limits.ts', find: 'say: 32_768', to: 'say: 16_384' }
];
/** SAY_LOWER, the wire renamed launch-b.wire.json, and (R2) its label renamed too. */
const SAY_RENAMED = (label) => [
  ...SAY_LOWER,
  ...(label === null ? [] : [{ file: WIRE, json: (w) => reseal({ ...w, label }) }]),
  { file: WIRE, renameTo: `${FROZEN}/launch-b.wire.json` }
];
/**
 * The frozen `odd-id` request dropped from the set's vectors, the wire's
 * `vectors.sha256` repinned and resealed, and main's session arm refusing an
 * id outside [0-9a-f-]; with `asReplace`, the replaced seal appended to the
 * wire's history as `--replace` writes it (V1w), so (a) passes.
 */
const ODD_DROPPED = (asReplace) => [
  { file: `${FROZEN}/launch.vectors.json`, json: (v) => ((v.requests = v.requests.filter((r) => r.name !== 'odd-id')), v) },
  { file: WIRE, json: (w) => {
    const was = { seal: w.seal, phoneBuild: w.phoneBuild, macVersion: w.macVersion, why: 'ablation: V1w' };
    w.vectors.sha256 = sha256(readFileSync(join(CLONE, FROZEN, 'launch.vectors.json')));
    if (asReplace) w.history = [...w.history, was];
    return reseal(w);
  } },
  SESSION
];
/** The reader's two new refusals, broken in the clone's own reader (X7: R-d, X8: R-f). */
const READER = 'build/p33311/swift-wire.mjs';
const X7_EDIT = { file: READER, find: '      refuse(src, toks[p].at, R_D);\n', to: '      void R_D;\n' };
const X8_EDIT = { file: READER, find: '    const held = named ?? made;\n', to: '    const held = undefined;\n' };
/**
 * The fix round's reader rules, each broken in the clone's own reader: R-h
 * (X9), R-g (X10), R-f past `<…>` (X11), past `.self` (X12) and through
 * `Self` (X13), and R-e's `nil` (X14, which refuses an optional set to nil
 * again, so the fixture's two lines that must NOT be unread are).
 */
const X9_EDIT = { file: READER, find: 'const inherited = [...d.inherits].find((n) => holders.has(n));', to: 'const inherited = undefined;' };
const X10_EDIT = { file: READER, find: 'const h = a.toks.find((t) => isId(t) && holders.has(t.v));', to: 'const h = undefined;' };
const X11_EDIT = { file: READER, find: "  if (isOp(ts[k], '<')) {\n", to: '  if (false) {\n' };
const X12_EDIT = { file: READER, find: "  if (isOp(ts[k], '.') && isId(ts[k + 1], 'self')) k += 2;\n", to: '  void 0;\n' };
const X13_EDIT = { file: READER, find: 'const own = s.owner !== null && holders.has(lastOf(s.owner.qual)) ? lastOf(s.owner.qual) : null;', to: 'const own = null;' };
const X14_EDIT = { file: READER, find: "const noLine = t.length === 2 && s.init !== null && s.init.length === 1 && isId(s.init[0], 'nil');", to: 'const noLine = false;' };
/** The holder of two kept lines the K arms plant beside PairedScreenDoor. */
const PAIR = (head) => `${head} {\n    let a = DoorLine(keeps: true)\n    let b = DoorLine(keeps: true)\n}\n\n`;
const ARMS = [
  // F: the frozen sets themselves
  { id: 'F1', clause: 'F1', what: 'a field deleted from types.PocketBlockedAnswer.fields, the seal left as it was', edits: [{ file: `${FROZEN}/launch.wire.json`, json: (w) => (delete w.types.PocketBlockedAnswer.fields.ageNote, w) }] },
  { id: 'F2', clause: 'F2', what: 'one byte changed inside a string of launch.vectors.json', edits: [{ file: `${FROZEN}/launch.vectors.json`, bytes: (t) => t.replace(/("about":\s*")(.)/, (_m, lead, c) => `${lead}${c === 'X' ? 'Y' : 'X'}`) }] },
  { id: 'F3a', clause: 'F3', what: 'launch.wire.json deleted', edits: [{ file: `${FROZEN}/launch.wire.json`, remove: true }] },
  { id: 'F3b', clause: 'F3', what: 'a resealed file whose first arm points at /noSuchKey', edits: [{ file: `${FROZEN}/launch.wire.json`, json: (w) => reseal({ ...w, arms: [{ ...w.arms[0], pointer: '/noSuchKey' }, ...w.arms.slice(1)] }) }] },
  // The fix round of 2026-10-08: the arms are re-derived, so a resealed file
  // that dropped refuse arms (the verifier's H4 dropped all 462 and passed)
  // is red on F3, one arm or every one.
  { id: 'F3c', clause: 'F3', what: 'one refuse arm dropped from the wire and the file resealed', edits: [{ file: `${FROZEN}/launch.wire.json`, json: (w) => reseal({ ...w, arms: w.arms.filter((_a, i) => i !== w.arms.findIndex((x) => x.expect === 'refuse')) }) }] },
  { id: 'F3d', clause: 'F3', what: "every refuse arm dropped and the file resealed (the verifier's H4)", edits: [{ file: `${FROZEN}/launch.wire.json`, json: (w) => reseal({ ...w, arms: w.arms.filter((a) => a.expect !== 'refuse') }) }] },
  { id: 'F4a', clause: 'F4', what: 'ios/TortieTests/DoorFrozenTests.swift deleted', edits: [{ file: 'ios/TortieTests/DoorFrozenTests.swift', remove: true }] },
  { id: 'F4b', clause: 'F4', what: "assert-door-only-adds.mjs taken out of package.json's build", edits: [{ file: 'package.json', re: /\s*&&\s*node build\/assert-door-only-adds\.mjs/, to: '' }] },
  // R: the routes and the requests
  { id: 'R1a', clause: 'R1', what: 'the scrollback row removed from POCKET_ROUTES', edits: [{ file: 'src/main/pocket/door/table.ts', find: "  { id: 'scrollback', method: 'GET', path: '/v1/scrollback', reads: true, windowOnly: false, signed: true },\n", to: '' }] },
  { id: 'R1b', clause: 'R1', what: 'turns with signed: false', edits: [{ file: 'src/main/pocket/door/table.ts', find: "{ id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: true }", to: "{ id: 'turns', method: 'GET', path: '/v1/turns', reads: true, windowOnly: false, signed: false }" }] },
  { id: 'R2a', clause: 'R2', what: 'CHOOSE_KEYS in writes.ts gains ,force', edits: [{ file: 'src/main/pocket/writes.ts', find: "const CHOOSE_KEYS = 'mark,marker,question,session,write';", to: "const CHOOSE_KEYS = 'mark,marker,question,session,write,force';" }] },
  { id: 'R2b', clause: 'R2', what: 'readScreenQuery reads held instead of since', edits: [{ file: 'src/main/pocket/routes.ts', find: "  const since = query.get('since');", to: "  const since = query.get('held');" }] },
  { id: 'R3', clause: 'R3', what: "PAIRING_INFO 'tortie-pocket-pair-v1' becomes v2", edits: [{ file: 'src/main/pocket/pairing.ts', find: "const PAIRING_INFO = 'tortie-pocket-pair-v1';", to: "const PAIRING_INFO = 'tortie-pocket-pair-v2';" }] },
  { id: 'R4a', clause: 'R4', what: 'POCKET_KEYS_MAX_ITEMS = 32', edits: [{ file: 'src/shared/ipc/pocket.ts', find: 'export const POCKET_KEYS_MAX_ITEMS = 64;', to: 'export const POCKET_KEYS_MAX_ITEMS = 32;' }] },
  { id: 'R4b', clause: 'R4', what: "'oldest' out of POCKET_SESSIONS_SORT", edits: [{ file: 'src/shared/ipc/pocket.ts', find: "export const POCKET_SESSIONS_SORT = ['recent', 'name', 'oldest'] as const;", to: "export const POCKET_SESSIONS_SORT = ['recent', 'name'] as const;" }] },
  { id: 'R4c', clause: 'R4', what: 'PER_SOURCE_MAX = 2', edits: [{ file: 'src/main/pocket/door/limits.ts', find: 'export const PER_SOURCE_MAX = 4;', to: 'export const PER_SOURCE_MAX = 2;' }] },
  { id: 'R5', clause: 'R5', what: "the case 'turns': arm deleted from main's read switch", edits: [{ file: 'src/main/pocket/ipc.ts', re: /\n {10}case 'turns': \{[\s\S]*?\n {10}\}(?=\n)/, to: '' }] },
  // The fix round of 2026-10-08: the verifier's M9b, M9d and M9e passed the
  // gate, conformance:pocket and the pocket vitest. A condition in an arm is
  // invisible to text; driven, each answers that old phone's request 404.
  { id: 'R5b', clause: 'R5', what: "|| query.get('v') === null in the turns arm (the verifier's M9b)", edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return id === null\n              ? null\n              : await routes.turns(', to: "return id === null || query.get('v') === null\n              ? null\n              : await routes.turns(" }] },
  { id: 'R5c', clause: 'R5', what: "query.get('v') === null ? null : in the blocked arm, the phone's main list (the verifier's M9e)", edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.blocked();', to: "return query.get('v') === null ? null : routes.blocked();" }] },
  { id: 'R5d', clause: 'R5', what: "|| query.get('v') === null in the session arm (the verifier's M9d)", edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return id === null ? null : await routes.session(id);', to: "return id === null || query.get('v') === null ? null : await routes.session(id);" }] },
  { id: 'R5e', clause: 'R5', what: 'the turns arm reads sid where the old phone sends id', edits: [{ file: 'src/main/pocket/ipc.ts', find: "case 'turns': {\n            const id = query.get('id');", to: "case 'turns': {\n            const id = query.get('sid');" }] },
  { id: 'R5f', clause: 'R5', what: "server.ts's pair arm sends an allowed phone's certificate as certificate, not cert", edits: [{ file: 'src/main/pocket/server.ts', find: "return JSON.stringify({ state: 'allowed', cert: answer.cert });", to: "return JSON.stringify({ state: 'allowed', certificate: answer.cert });" }] },
  { id: 'R6', clause: 'R6', what: 'phoneIdOf hashes a different slice', edits: [{ file: 'src/main/pocket/pairing.ts', find: '    .slice(0, 32);', to: '    .slice(1, 33);' }] },
  // A: the answers
  { id: 'A1', clause: 'A1', what: "the scrollback answers dropped from today's vectors", edits: [{ file: VECTORS, json: (v) => (delete v.answers['scrollback-page'], delete v.answers['scrollback-ended'], v) }] },
  { id: 'A2a', clause: 'A2', what: 'the blocked composer drops emptyLine, vectors regenerated', regen: true, edits: [{ file: 'src/main/pocket/routes.ts', find: '        emptyLine: facts.emptyLine,\n', to: '' }] },
  { id: 'A2b', clause: 'A2', what: 'the blocked composer writes othersOmitted as String(n), vectors regenerated', regen: true, edits: [{ file: 'src/main/pocket/routes.ts', find: 'othersOmitted: rest.length - others.length,', to: 'othersOmitted: String(rest.length - others.length),' }] },
  { id: 'A3a', clause: 'A3', alsoGreen: ['A2'], what: "'quota' added to PocketWriteReason, composed by nothing", edits: [{ file: 'src/shared/ipc/pocket.ts', find: "  | 'character';", to: "  | 'character'\n  | 'quota';" }] },
  { id: 'A3b', clause: 'A3', what: 'ageNote?: string in PocketBlockedAnswer', edits: [{ file: 'src/shared/ipc/pocket.ts', find: 'one spelling, handed over rather than spelled by a client.\n   */\n  ageNote: string;', to: 'one spelling, handed over rather than spelled by a client.\n   */\n  ageNote?: string;' }] },
  { id: 'A4a', clause: 'A4', what: 'POCKET_SCREEN_MAX_COLS = 1024', edits: [{ file: 'src/shared/ipc/pocket.ts', find: 'export const POCKET_SCREEN_MAX_COLS = 512;', to: 'export const POCKET_SCREEN_MAX_COLS = 1024;' }] },
  { id: 'A4b', clause: 'A4', what: 'MAX_SCROLLBACK_LINES = 200_000', edits: [{ file: 'src/shared/settings.ts', find: 'export const MAX_SCROLLBACK_LINES = 100_000;', to: 'export const MAX_SCROLLBACK_LINES = 200_000;' }] },
  { id: 'A4c', clause: 'A4', what: 'SCREEN_HOLD_MS = 20_000', edits: [{ file: 'src/main/screen/watch.ts', find: 'export const SCREEN_HOLD_MS = 10_000;', to: 'export const SCREEN_HOLD_MS = 20_000;' }] },
  { id: 'A5a', clause: 'A5', what: "DoorAnswer's status: 200 | 404 | 204", edits: [{ file: 'src/main/pocket/bind.ts', find: '  readonly status: 200 | 404;', to: '  readonly status: 200 | 404 | 204;' }] },
  { id: 'A5b', clause: 'A5', what: 'sendPocket(res, 400, null) in listener.ts', edits: [{ file: 'src/main/pocket/door/listener.ts', find: 'else sendPocket(res, 404, null);', to: 'else sendPocket(res, 400, null);' }] },
  // P: the phone, read as text
  // Phase 346 (build/p346/SPEC.md D26): the one lenient read is `try?` on
  // decodeIfPresent alone; the same `try?` on a plain decode takes a refusal
  // away from a key, and the reader leaves it unread.
  { id: 'P0e', clause: 'P0', what: "the sessions answer's lenient start read widened to try? on a plain decode", edits: [{ file: 'ios/Tortie/Door/Contract.swift', find: 'start = (try? c.decodeIfPresent(PocketSessionsStart.self, forKey: .start)) ?? nil', to: 'start = try? c.decode(PocketSessionsStart.self, forKey: .start)' }] },
  { id: 'P0', clause: 'P0', what: 'an idiom the reader does not know in a reachable decoder', edits: [{ file: 'ios/Tortie/Door/Contract.swift', find: '        emptyLine = try c.decode(String.self, forKey: .emptyLine)\n        ageNote = try c.decode(String.self, forKey: .ageNote)', to: '        emptyLine = try c.decode(String.self, forKey: .emptyLine)\n        ageNote = try c.decode(String.self, forKey: .ageNote)\n        x = try c.decodeIfPresentOrDefault(String.self, forKey: .x)' }] },
  { id: 'P0b', clause: 'P0', what: 'one read called through a renamed signedGet, so the reader no longer sees that route', edits: [{ file: 'ios/Tortie/Door/DoorClient.swift', find: 'try await signedGet(PocketBlockedAnswer.self, target: Self.blockedTarget, door: door)', to: 'try await signedRead(PocketBlockedAnswer.self, target: Self.blockedTarget, door: door)' }] },
  { id: 'P1', clause: 'P1', what: "PocketSessionDetail's screen read with decode, not decodeIfPresent", edits: [{ file: 'ios/Tortie/Door/Contract.swift', find: 'screen = try c.decodeIfPresent(Bool.self, forKey: .screen)', to: 'screen = try c.decode(Bool.self, forKey: .screen)' }] },
  { id: 'P2a', clause: 'P2', what: 'busy removed from PocketWriteAnswer.Outcome', edits: [{ file: 'ios/Tortie/Door/Contract.swift', find: 'enum Outcome: String, Sendable, Codable { case done, refused, failed, busy }', to: 'enum Outcome: String, Sendable, Codable { case done, refused, failed }' }] },
  { id: 'P2b', clause: 'P2', what: 'blockedSince read as a door number', edits: [{ file: 'ios/Tortie/Door/Contract.swift', find: 'blockedSince = try c.decode(Double.self, forKey: .blockedSince)', to: 'blockedSince = try c.doorNumber(forKey: .blockedSince)' }] },
  { id: 'P3', clause: 'P3', what: 'static let widest = 256', edits: [{ file: 'ios/Tortie/Door/Contract.swift', find: 'static let widest = 512', to: 'static let widest = 256' }] },
  // The reader proves itself first (§5.6): a reader rule broken in the CLONE's
  // own reader, run by the clone's own gate, must fail its fixtures before
  // any clause runs.
  { id: 'X1', reader: true, what: "the reader's contains branch stops making its key optional", edits: [{ file: 'build/p33311/swift-wire.mjs', find: 'optionalKey: key, only: key', to: 'optionalKey: null, only: key' }] },
  { id: 'X2', reader: true, what: 'the reader takes a read behind try? as a read', edits: [{ file: 'build/p33311/swift-wire.mjs', find: "if (!isId(before, 'try')) {", to: "if (!isId(before, 'try') && !isId(before, 'try?')) {" }] },
  { id: 'X3', reader: true, what: 'the reader stops narrowing a case on if w == "x"', edits: [{ file: 'build/p33311/swift-wire.mjs', find: 'cases: remaining.filter((w) => w === word) }', to: 'cases: remaining }' }] },
  { id: 'X4', reader: true, what: 'the reader merges a key read twice to the WIDER kind', edits: [{ file: 'build/p33311/swift-wire.mjs', find: '  if (kindCovers(a.kind, b.kind)) kind = b.kind;', to: '  if (kindCovers(a.kind, b.kind)) kind = a.kind;' }] },
  // Phase 333.11.1 (SPEC-1 §5.1). Every way the launch phone asks, replayed:
  // a read arm of main's switch that refuses one is red on R5 ...
  { id: 'V1', clause: 'R5', what: "the turns arm refuses a query with no to (the phone's newest page sends none)", edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return id === null\n              ? null\n              : await routes.turns(', to: "return id === null || query.get('to') === null\n              ? null\n              : await routes.turns(" }] },
  { id: 'V2', clause: 'R5', what: "the screen arm refuses a query with no since (the phone's first read sends none)", edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.screen(query, closing);', to: "return query.get('since') === null ? null : routes.screen(query, closing);" }] },
  { id: 'V3', clause: 'R5', what: 'the sessions arm refuses a query with no agent (SessionsQuery.standard sends none)', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.sessions(query);', to: "return query.get('agent') === null ? null : routes.sessions(query);" }] },
  { id: 'V4', clause: 'R5', what: "the sessions arm refuses show=active, the phone's default word", edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.sessions(query);', to: "return query.get('show') === 'active' ? null : routes.sessions(query);" }] },
  // ... and the same narrowing in the shipping query readers and write
  // parsers is red on R2.
  { id: 'V9', clause: 'R2', what: 'readSessionsQuery refuses show=active', edits: [{ file: 'src/main/pocket/routes.ts', find: "  const show = closedWord(query.get('show'), POCKET_SESSIONS_SHOW, POCKET_SESSIONS_DEFAULT.show);", to: "  const show = query.get('show') === 'active' ? undefined : closedWord(query.get('show'), POCKET_SESSIONS_SHOW, POCKET_SESSIONS_DEFAULT.show);" }] },
  { id: 'V10', clause: 'R2', what: 'readScreenQuery refuses a query with no since', edits: [{ file: 'src/main/pocket/routes.ts', find: "  const since = query.get('since');\n  if (since !== null && !isLowerHexOf", to: "  const since = query.get('since');\n  if (since === null) return { ok: false, reason: 'since' };\n  if (since !== null && !isLowerHexOf" }] },
  { id: 'V11', clause: 'R2', what: 'parseEndBody refuses batch: true (End these)', edits: [{ file: 'src/main/pocket/writes.ts', find: "typeof batch !== 'boolean') return { ok: false, write };", to: "typeof batch !== 'boolean' || batch) return { ok: false, write };" }] },
  { id: 'V12', clause: 'R2', what: 'parseKeysBody refuses a named key other than BSpace while a dialog mark is sent', edits: [{ file: 'src/main/pocket/writes.ts', find: "  if (keys.length > 1 && keys.some((key) => 'k' in key && key.k !== 'BSpace')) return { ok: false, write };", to: "  if (keys.length > 1 && keys.some((key) => 'k' in key && key.k !== 'BSpace')) return { ok: false, write };\n  if (dialog !== null && keys.some((key) => 'k' in key && key.k !== 'BSpace')) return { ok: false, write };" }] },
  // A Mac-side row lowered, emptied or removed and the Mac changed to match.
  // Not resealed, the seal holds it (G1); resealed, the phone's own number
  // read from the Swift holds it (R4, A4) AND the committed copy does (F1),
  // each on its own (G3 to G5); a cap only the Mac knows, resealed lower, is
  // held by the committed copy alone (G6).
  { id: 'G1', clause: 'F1', what: 'PER_SOURCE_MAX 2 in the wire, not resealed, and in limits.ts', edits: [
    { file: WIRE, json: (w) => (limitRow(w, 'PER_SOURCE_MAX').value = 2, w) },
    { file: 'src/main/pocket/door/limits.ts', find: 'export const PER_SOURCE_MAX = 4;', to: 'export const PER_SOURCE_MAX = 2;' }
  ] },
  { id: 'G3', clause: 'R4', alsoRed: ['F1'], what: 'PER_SOURCE_MAX 2 in the wire, resealed, and in limits.ts', edits: [
    { file: WIRE, json: (w) => (limitRow(w, 'PER_SOURCE_MAX').value = 2, reseal(w)) },
    { file: 'src/main/pocket/door/limits.ts', find: 'export const PER_SOURCE_MAX = 4;', to: 'export const PER_SOURCE_MAX = 2;' }
  ] },
  { id: 'G4', clause: 'A4', alsoRed: ['F1'], what: "PocketScreen.widest's Mac list emptied in the wire, resealed, and POCKET_SCREEN_MAX_COLS = 1024", edits: [
    { file: WIRE, json: (w) => (w.bounds.find((b) => b.phone === 'PocketScreen.widest').mac = [], reseal(w)) },
    { file: 'src/shared/ipc/pocket.ts', find: 'export const POCKET_SCREEN_MAX_COLS = 512;', to: 'export const POCKET_SCREEN_MAX_COLS = 1024;' }
  ] },
  { id: 'G5', clause: 'R4', alsoRed: ['F1'], what: 'the KEEP_ALIVE_TIMEOUT_MS row removed from the wire, resealed, and the constant 3_000', edits: [
    { file: WIRE, json: (w) => ((w.macLimits = w.macLimits.filter((r) => r.mac !== 'KEEP_ALIVE_TIMEOUT_MS')), reseal(w)) },
    { file: 'src/main/pocket/door/limits.ts', find: 'export const KEEP_ALIVE_TIMEOUT_MS = 5_000;', to: 'export const KEEP_ALIVE_TIMEOUT_MS = 3_000;' }
  ] },
  { id: 'G6', clause: 'F1', what: 'POCKET_WRITE_BODY_CAPS.say 16384 in the wire, resealed, and in limits.ts (no phone number exists for it)', edits: [
    { file: WIRE, json: (w) => (limitRow(w, 'POCKET_WRITE_BODY_CAPS.say').value = 16384, reseal(w)) },
    { file: 'src/main/pocket/door/limits.ts', find: 'say: 32_768', to: 'say: 16_384' }
  ] },
  // The request record is read from the phone and sealed.
  { id: 'P0c', clause: 'P0', what: 'turnsTarget appends its to with target.append, an idiom the request reader does not know', edits: [{ file: 'ios/Tortie/Door/DoorClient.swift', find: 'if let to { target += "&to=\\(to)" }', to: 'if let to { target.append("&to=\\(to)") }' }] },
  { id: 'P0d', clause: 'P0', what: "the turns record's to sent always in the wire, resealed, with the phone's bytes unchanged", edits: [{ file: WIRE, json: (w) => (recordOf(w, 'turns').query.find((q) => q.name === 'to').sent = 'always', reseal(w)) }] },
  { id: 'F3e', clause: 'F3', what: "the sessions record loses its machine item, resealed, and the frozen sessions request sends machine", edits: [{ file: WIRE, json: (w) => ((recordOf(w, 'sessions').query = recordOf(w, 'sessions').query.filter((q) => q.name !== 'machine')), reseal(w)) }] },
  // The gate builder's own arms (not in SPEC-1 §5.1): every red condition
  // the phase adds is seen red at least once, so none of them is a check
  // that cannot fail.
  { id: 'F1h', clause: 'F1', what: "the wire's history emptied and the file resealed: a hand edit that does not continue the committed copy's history", edits: [{ file: WIRE, json: (w) => ((w.history = []), reseal(w)) }] },
  { id: 'F1v', clause: 'F1', what: 'the wire written as format 1 and resealed: a retired format', edits: [{ file: WIRE, json: (w) => ((w.format = 1), reseal(w)) }] },
  { id: 'F3f', clause: 'F3', what: "an ask's rule written mac>phone and the file resealed", edits: [{ file: WIRE, json: (w) => ((w.asks[0].rule = 'mac>phone'), reseal(w)) }] },
  { id: 'R2s', clause: 'R2', what: "one frozen signature the frozen phone's seed does not reproduce, the vectors' sha256 and the seal written to match", edits: [
    { file: `${FROZEN}/launch.vectors.json`, json: (v) => {
      const end = v.requests.find((r) => r.name === 'end');
      end.signature = `${end.signature[0] === 'A' ? 'B' : 'A'}${end.signature.slice(1)}`;
      return v;
    } },
    { file: WIRE, json: (w) => ((w.vectors.sha256 = sha256(readFileSync(join(CLONE, FROZEN, 'launch.vectors.json')))), reseal(w)) }
  ] },
  { id: 'R2c', clause: 'R2', what: "the sessions record's agent drawn from the 35 key names, resealed: a cross product past REPLAY_CEILING", edits: [{ file: WIRE, json: (w) => ((recordOf(w, 'sessions').query.find((q) => q.name === 'agent').value = { words: 'ScreenKeyName' }), reseal(w)) }] },
  { id: 'A4d', clause: 'A4', what: "PocketScreen.widest resealed at 1024 and POCKET_SCREEN_MAX_COLS = 1024: today's phone value still bounds the Mac", edits: [
    { file: WIRE, json: (w) => ((w.bounds.find((b) => b.phone === 'PocketScreen.widest').value = 1024), reseal(w)) },
    { file: 'src/shared/ipc/pocket.ts', find: 'export const POCKET_SCREEN_MAX_COLS = 512;', to: 'export const POCKET_SCREEN_MAX_COLS = 1024;' }
  ] },
  { id: 'X5', reader: true, fixture: 'requests-targets', what: 'the request reader writes every name it reads as sent always', edits: [{ file: 'build/p33311/swift-wire.mjs', find: "const sentIn = (conditional) => (conditional ? 'sometimes' : 'always');", to: "const sentIn = (conditional) => (conditional ? 'always' : 'always');" }] },
  // The fix round (the reverify's W20, W21, W22 and W18). A Mac-held bound
  // re-ruled or re-filed and resealed, and a limit re-filed and resealed,
  // each with the Mac moved past the launch phone: the reader's own rule and
  // file (A4) and the gate's own file (R4) hold it, AND the committed copy
  // does (F1), each on its own. The decoy is a file the clone did not have,
  // holding the old value, removed by the restore.
  { id: 'A4r', clause: 'A4', alsoRed: ['F1'], what: "PocketScreen.widest resealed as instance<=phone with its Mac list kept, and POCKET_SCREEN_MAX_COLS = 1024 (the reverify's W20)", edits: [
    { file: WIRE, json: (w) => ((w.bounds.find((b) => b.phone === 'PocketScreen.widest').rule = 'instance<=phone'), reseal(w)) },
    { file: 'src/shared/ipc/pocket.ts', find: 'export const POCKET_SCREEN_MAX_COLS = 512;', to: 'export const POCKET_SCREEN_MAX_COLS = 1024;' }
  ] },
  { id: 'A4f', clause: 'A4', alsoRed: ['F1'], what: "PocketScreen.widest's macFile resealed to a decoy holding 512, and the real POCKET_SCREEN_MAX_COLS = 1024 (the reverify's W21)", edits: [
    { file: DECOY, create: 'export const POCKET_SCREEN_MAX_COLS = 512;\n' },
    { file: WIRE, json: (w) => ((w.bounds.find((b) => b.phone === 'PocketScreen.widest').macFile = DECOY), reseal(w)) },
    { file: 'src/shared/ipc/pocket.ts', find: 'export const POCKET_SCREEN_MAX_COLS = 512;', to: 'export const POCKET_SCREEN_MAX_COLS = 1024;' }
  ] },
  { id: 'R4f', clause: 'R4', alsoRed: ['F1'], what: "the POCKET_WRITE_BODY_CAPS.say row's file resealed to a decoy holding 32_768, and the real say: 16_384 (the reverify's W22)", edits: [
    { file: DECOY, create: 'export const POCKET_WRITE_BODY_CAPS = { end: 512, choose: 512, say: 32_768, keys: 16_384 };\n' },
    { file: WIRE, json: (w) => ((limitRow(w, 'POCKET_WRITE_BODY_CAPS.say').file = DECOY), reseal(w)) },
    { file: 'src/main/pocket/door/limits.ts', find: 'say: 32_768', to: 'say: 16_384' }
  ] },
  { id: 'A4n', clause: 'A4', alsoRed: ['F1'], what: "PocketScreen.widest resealed under another name as instance<=phone, and POCKET_SCREEN_MAX_COLS = 1024: the reader's own bound is held at today's value", edits: [
    { file: WIRE, json: (w) => {
      const widest = w.bounds.find((b) => b.phone === 'PocketScreen.widest');
      widest.phone = 'PocketScreen.widestOnce';
      widest.rule = 'instance<=phone';
      return reseal(w);
    } },
    { file: 'src/shared/ipc/pocket.ts', find: 'export const POCKET_SCREEN_MAX_COLS = 512;', to: 'export const POCKET_SCREEN_MAX_COLS = 1024;' }
  ] },
  { id: 'X6', reader: true, fixture: 'requests-unread', what: 'the reader counts a kept line made by a factory or an expression as held (the reverify\'s W18)', edits: [{ file: 'build/p33311/swift-wire.mjs', find: 'const heldWhereMade = storedInitializer(toks, match, holder.open, i, name);', to: 'const heldWhereMade = true;' }] },
  // Phase 333.11.2 (SPEC-2 §5.3): the plants 333.11.1's reverify found green.
  // A SET IS ITS LABEL: a rename or a relabel committed is judged against
  // every copy its label ever had (R1, R2), and every request a committed
  // copy's vectors hold stays (V1h, the entry's V1), each committed in the
  // clone's own repository and each red on F1 ...
  { id: 'R1', clause: 'F1', what: "the say limit resealed at 16384 (and limits.ts), the wire renamed launch-b.wire.json with its label kept, committed", commit: SAY_RENAMED(null), edits: [] },
  { id: 'R2', clause: 'F1', what: 'R1 with the label renamed launch-b too, committed', commit: SAY_RENAMED('launch-b'), edits: [] },
  { id: 'V1h', clause: 'F1', what: "the entry's V1: the odd-id request dropped from launch.vectors.json, the wire repinned and resealed, and main's session arm refusing that id, committed", commit: ODD_DROPPED(false), edits: [] },
  // ... the controls that keep their clause ...
  { id: 'R1c', clause: 'F1', what: 'the say limit resealed at 16384 (and limits.ts), no rename, committed', commit: [...SAY_LOWER], edits: [] },
  { id: 'V1c', clause: 'R5', what: "main's session arm refusing an id outside [0-9a-f-] alone (the frozen odd-id request still in the vectors)", edits: [SESSION] },
  { id: 'K3', clause: 'R4', what: 'a fourth kept line as a lazy var, which the reader does not count', edits: [{ file: APP, find: SIDE, to: `${SIDE}    private lazy var extra = DoorLine(keeps: true)\n` }] },
  // ... the same plants left uncommitted ...
  { id: 'R1w', clause: 'F1', what: 'R1 uncommitted: red on (a) and (b)', edits: SAY_RENAMED(null) },
  { id: 'R2w', clause: 'F1', what: 'R2 uncommitted: red on (c), launch gone', edits: SAY_RENAMED('launch-b') },
  { id: 'V1w', clause: 'F1', what: "V1h uncommitted, with the HEAD copy's seal appended to history as --replace writes it, so (a) passes and (b) alone holds it", edits: ODD_DROPPED(true) },
  // ... every spelling of a kept line counted or unread (red on P0) ...
  { id: 'K1', clause: 'P0', what: 'a fourth kept line spelled private let extra: DoorLine = .init(keeps: true)', edits: [{ file: APP, find: SIDE, to: `${SIDE}    private let extra: DoorLine = .init(keeps: true)\n` }] },
  { id: 'K2', clause: 'P0', what: 'a fourth kept line spelled private let extra = DoorLine.init(keeps: true)', edits: [{ file: APP, find: SIDE, to: `${SIDE}    private let extra = DoorLine.init(keeps: true)\n` }] },
  { id: 'K4', clause: 'P0', what: 'a fourth kept line spelled KeptLine(keeps: true) through typealias KeptLine = DoorLine', edits: [
    { file: APP, find: SIDE, to: `${SIDE}    private let extra = KeptLine(keeps: true)\n` },
    { file: APP, find: DOOR, to: `typealias KeptLine = DoorLine\n\n${DOOR}` }
  ] },
  { id: 'K6', clause: 'P0', what: 'PairedScreenDoor holds a LinePair, a type holding two kept lines', edits: [
    { file: APP, find: SIDE, to: `${SIDE}    private let pair = LinePair()\n` },
    { file: APP, find: DOOR, to: `final class LinePair {\n    let a = DoorLine(keeps: true)\n    let b = DoorLine(keeps: true)\n}\n\n${DOOR}` }
  ] },
  // ... and, since the fix round (SPEC-2 §As built, "The fix round"), the
  // verifier's spellings every clause passed: a kept line held through a
  // superclass (K7, its KI1), a holder held through its subclass (K8, KI2),
  // named through a typealias (K9, KA1), specialised (K10, KG1), made through
  // `.self.init()` (K11, KS1) and through `Self()` in the door's own
  // extension (K12), each red on P0 ...
  { id: 'K7', clause: 'P0', what: 'a fourth kept line held through a superclass: class DoorBase holds one, and PairedScreenDoor inherits it', edits: [
    { file: APP, find: DOOR, to: 'class DoorBase {\n    let extra = DoorLine(keeps: true)\n}\n\nfinal class PairedScreenDoor: DoorBase, ScreenDoor {\n' }
  ] },
  { id: 'K8', clause: 'P0', what: 'PairedScreenDoor holds a MorePair, a subclass of LinePair, which holds two kept lines', edits: [
    { file: APP, find: SIDE, to: `${SIDE}    private let pair = MorePair()\n` },
    { file: APP, find: DOOR, to: `${PAIR('class LinePair')}final class MorePair: LinePair {}\n\n${DOOR}` }
  ] },
  { id: 'K9', clause: 'P0', what: 'PairedScreenDoor holds a LinePair named through typealias Pair = LinePair', edits: [
    { file: APP, find: SIDE, to: `${SIDE}    private let pair = Pair()\n` },
    { file: APP, find: DOOR, to: `${PAIR('final class LinePair')}typealias Pair = LinePair\n\n${DOOR}` }
  ] },
  { id: 'K10', clause: 'P0', what: 'PairedScreenDoor holds a GenericPair<Int>(), a generic type holding two kept lines', edits: [
    { file: APP, find: SIDE, to: `${SIDE}    private let pair = GenericPair<Int>()\n` },
    { file: APP, find: DOOR, to: `${PAIR('final class GenericPair<T>')}${DOOR}` }
  ] },
  { id: 'K11', clause: 'P0', what: 'PairedScreenDoor holds a LinePair made as LinePair.self.init()', edits: [
    { file: APP, find: SIDE, to: `${SIDE}    private let pair = LinePair.self.init()\n` },
    { file: APP, find: DOOR, to: `${PAIR('final class LinePair')}${DOOR}` }
  ] },
  { id: 'K12', clause: 'P0', what: 'a second PairedScreenDoor held as static let spare = Self() in its own extension', edits: [
    { file: APP, find: DOOR, to: `extension PairedScreenDoor {\n    static let spare = Self()\n}\n\n${DOOR}` }
  ] },
  // ... and the spec's own, so every red condition the phase adds is seen
  // red once: a hand edit under a new name (F1 (a) by label, which no
  // other arm holds alone); one label, two sets; a retired label held;
  // RETIRED_SETS malformed; a set beside launch with the floor unraised; and
  // the reader's two new refusals broken in the clone's own reader.
  { id: 'F1hr', clause: 'F1', what: "F1h under a new name: the wire's history emptied, resealed and renamed launch-b.wire.json with its label kept, so (a) holds it to the HEAD copy of its label", edits: [
    { file: WIRE, json: (w) => ((w.history = []), reseal(w)) },
    { file: WIRE, renameTo: `${FROZEN}/launch-b.wire.json` }
  ] },
  { id: 'F1d', clause: 'F1', alsoRed: ['F3'], what: "launch-copy.wire.json holding the wire's exact bytes: one label, two sets", edits: [{ file: `${FROZEN}/launch-copy.wire.json`, from: WIRE }] },
  { id: 'F1x', clause: 'F1', own: true, what: "the clone's gate retires launch while launch.wire.json still holds it", edits: [{ file: OWN_GATE, find: 'const RETIRED_SETS = Object.freeze({});', to: "const RETIRED_SETS = Object.freeze({ launch: '2026-10-15: ablation' });" }] },
  { id: 'F1m', clause: 'F1', own: true, what: "the clone's gate's RETIRED_SETS names Launch, not a label, with no ruling", edits: [{ file: OWN_GATE, find: 'const RETIRED_SETS = Object.freeze({});', to: "const RETIRED_SETS = Object.freeze({ Launch: '' });" }] },
  { id: 'F3o', clause: 'F3', alsoGreen: ['F1'], what: 'second.wire.json, the wire with the label second and resealed, beside launch with FROZEN_SETS_FLOOR unraised (a new set: F1 notes it)', edits: [{ file: `${FROZEN}/second.wire.json`, from: WIRE, json: (w) => reseal({ ...w, label: 'second' }) }] },
  { id: 'X7', reader: true, fixture: 'requests-unread', what: 'the reader stops refusing a call passing keeps: that is not DoorLine(keeps:) (R-d)', edits: [X7_EDIT] },
  { id: 'X8', reader: true, fixture: 'requests-unread', what: 'the reader stops refusing a stored property holding a type that holds kept lines (R-f)', edits: [X8_EDIT] },
  // ... and the fix round's reader rules, each broken in the clone's reader.
  { id: 'X9', reader: true, fixture: 'requests-unread', what: 'the reader stops refusing a type that inherits a type holding kept lines (R-h)', edits: [X9_EDIT] },
  { id: 'X10', reader: true, fixture: 'requests-unread', what: 'the reader stops refusing a typealias naming a type that holds kept lines (R-g)', edits: [X10_EDIT] },
  { id: 'X11', reader: true, fixture: 'requests-unread', what: "the reader's R-f stops reading past a generic argument clause H<…>", edits: [X11_EDIT] },
  { id: 'X12', reader: true, fixture: 'requests-unread', what: "the reader's R-f stops reading past H.self", edits: [X12_EDIT] },
  { id: 'X13', reader: true, fixture: 'requests-unread', what: "the reader's R-f stops reading Self as the holder in its own body or extension", edits: [X13_EDIT] },
  { id: 'X14', reader: true, fixture: 'requests-unread', what: "the reader's R-e refuses an optional DoorLine set to nil again", edits: [X14_EDIT] },
  // Controls: adding is allowed
  { id: 'C1', control: true, what: 'the Mac adds macVersion?: string to PocketBlockedAnswer and the blocked composer sends it', regen: true, edits: [
    { file: 'src/shared/ipc/pocket.ts', find: 'one spelling, handed over rather than spelled by a client.\n   */\n  ageNote: string;', to: 'one spelling, handed over rather than spelled by a client.\n   */\n  ageNote: string;\n  macVersion?: string;' },
    { file: 'src/main/pocket/routes.ts', find: '        emptyLine: facts.emptyLine,\n', to: "        emptyLine: facts.emptyLine,\n        macVersion: '0.110.0',\n" }
  ] },
  { id: 'C2', control: true, what: 'the Mac adds a GET row /v1/probe with a new id', edits: [
    { file: 'src/main/pocket/door/table.ts', find: "  { id: 'scrollback', method: 'GET', path: '/v1/scrollback', reads: true, windowOnly: false, signed: true },\n", to: "  { id: 'scrollback', method: 'GET', path: '/v1/scrollback', reads: true, windowOnly: false, signed: true },\n  { id: 'probe', method: 'GET', path: '/v1/probe', reads: true, windowOnly: false, signed: true },\n" },
    // Phase 346 moved its anchor: the route id list ends on start (build/p346/SPEC.md D4).
    { file: 'src/shared/ipc/pocket.ts', find: "  'start'\n] as const;", to: "  'start',\n  'probe'\n] as const;" }
  ] },
  { id: 'C3', control: true, what: 'the phone reads a new key with decodeIfPresent in PocketBlockedAnswer', edits: [
    { file: 'ios/Tortie/Door/Contract.swift', find: 'enum CodingKeys: String, CodingKey { case rows, others, othersOmitted, at, emptyLine, ageNote }', to: 'enum CodingKeys: String, CodingKey { case rows, others, othersOmitted, at, emptyLine, ageNote, macVersion }' },
    { file: 'ios/Tortie/Door/Contract.swift', find: '        emptyLine = try c.decode(String.self, forKey: .emptyLine)\n        ageNote = try c.decode(String.self, forKey: .ageNote)', to: '        emptyLine = try c.decode(String.self, forKey: .emptyLine)\n        ageNote = try c.decode(String.self, forKey: .ageNote)\n        macVersion = try c.decodeIfPresent(String.self, forKey: .macVersion)' }
  ] },
  { id: 'C4', control: true, what: "the Mac adds { state: 'later' } to the PocketEndOffer union, an open set", edits: [{ file: 'src/shared/ipc/pocket.ts', find: "  | { state: 'none' };", to: "  | { state: 'none' }\n  | { state: 'later' };" }] },
  { id: 'C5', control: true, what: 'the Mac raises PER_SOURCE_MAX to 8', edits: [{ file: 'src/main/pocket/door/limits.ts', find: 'export const PER_SOURCE_MAX = 4;', to: 'export const PER_SOURCE_MAX = 8;' }] },
  // The fix round: R5 drives the arms rather than banning a new name, so main
  // may read a query name an old phone never sends.
  { id: 'C6', control: true, what: 'the blocked arm reads an optional query name no old phone sends', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.blocked();', to: "return query.get('v') === 'later' ? null : routes.blocked();" }] },
  // Phase 333.11.1: the replay reaches no further than the launch phone.
  { id: 'Z0', control: true, what: 'nothing planted', edits: [] },
  // The fix round: an optional line set to nil makes no line (the
  // verifier's KV2), so honest code written that way leaves P0 green.
  { id: 'K5n', control: true, what: 'an optional DoorLine set to nil beside the three kept lines, which makes no line', edits: [{ file: APP, find: SIDE, to: `${SIDE}    private var spare: DoorLine? = nil\n` }] },
  { id: 'V5', control: true, what: 'the turns arm refuses a query with no limit, which the phone always sends', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return id === null\n              ? null\n              : await routes.turns(', to: "return id === null || query.get('limit') === null\n              ? null\n              : await routes.turns(" }] },
  { id: 'V6', control: true, what: 'the sessions arm refuses a query missing show, group or sort, which the phone always sends', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.sessions(query);', to: "return query.get('show') === null || query.get('group') === null || query.get('sort') === null ? null : routes.sessions(query);" }] },
  { id: 'V7', control: true, what: 'the sessions arm refuses show=archived, which the phone never sends', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.sessions(query);', to: "return query.get('show') === 'archived' ? null : routes.sessions(query);" }] },
  { id: 'V8', control: true, what: 'the scrollback arm refuses a query with no keep, which the phone always sends', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.scrollback(query, closing);', to: "return query.get('keep') === null ? null : routes.scrollback(query, closing);" }] },
  { id: 'G2', control: true, what: 'the Mac raises POCKET_WRITE_BODY_CAPS.say to 65_536', edits: [{ file: 'src/main/pocket/door/limits.ts', find: 'say: 32_768', to: 'say: 65_536' }] },
  // PHASE 333.12 (build/p33312/SPEC.md §6.4): R7, a launch-shaped store keeps
  // the eleven's hash and serves the launch routes; R8, the route ledger only
  // adds. R8g and R8gh read the clone's committed copies of the ledger and say
  // `not run` when there is none; R8gh is a HISTORY arm, so R8 is seen reading
  // a copy that is not HEAD's.
  { id: 'R7a', clause: 'R7', alsoRed: ['R2'], what: 'LEGACY_ALLOWED_ROUTES without keys', edits: [{ file: 'src/shared/ipc/pocket.ts', find: "  'end',\n  'keys',\n  'pair',", to: "  'end',\n  'pair'," }] },
  { id: 'R7b', clause: 'R7', alsoRed: ['R5'], what: 'allowedRoutesFor answers [] for a store that never recorded a set', edits: [{ file: 'src/main/pocket/allowed-routes.ts', find: '  return stored ?? LEGACY_ALLOWED_ROUTES;', to: '  return stored ?? [];' }] },
  { id: 'R8a', clause: 'R8', what: "the ledger's turns row moved to /v1/turnz against the frozen set", edits: [{ file: 'src/main/pocket/route-ledger.ts', find: "path: '/v1/turns'", to: "path: '/v1/turnz'" }] },
  { id: 'R8h', clause: 'R8', args: ['--ledger-copy', 'p33312-ledger-copy.ts'], what: 'a planted older copy of the ledger whose end row said another clause, through the pure ledgerLosses', edits: [{ file: 'p33312-ledger-copy.ts', create: (clone) => readFileSync(join(clone, 'src/main/pocket/route-ledger.ts'), 'utf8').replace("clause: 'end a session'", "clause: 'end any session'") }] },
  { id: 'R8g', clause: 'R8', committedLedger: true, what: "a ledger row's clause edited in the clone, read against its committed copy through git", edits: [LEDGER_END_CLAUSE] },
  { id: 'R8gh', clause: 'R8', committedLedger: true, what: "a ledger row's clause edited and COMMITTED, so only the base commit's copy holds it", commit: [LEDGER_END_CLAUSE], edits: [] },
  // Phase 346 moved its anchor: the ledger's last row is start's now (build/p346/SPEC.md §4.12).
  { id: 'R8c', control: true, what: 'a thirteenth ledger row appended (the ledger only adds)', edits: [{ file: 'src/main/pocket/route-ledger.ts', find: "clause: 'start a session in a project open in Tortie, on this Mac or another machine' }\n]);", to: "clause: 'start a session in a project open in Tortie, on this Mac or another machine' },\n  { id: 'probe', method: 'GET', path: '/v1/probe', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null }\n]);" }] },
  // Phase 333.11.2: a retirement done right reads green. A further set and
  // the floor one higher committed; then its file removed, its label named in
  // the clone gate's RETIRED_SETS and the floor back where it was, judged by
  // that gate.
  { id: 'F1r', control: true, own: true, what: `a ruled retirement: second.wire.json and FROZEN_SETS_FLOOR = ${String(FLOOR_NOW + 1)} committed, then the file removed, second named in RETIRED_SETS and the floor at ${String(FLOOR_NOW)}`, commit: [
    { file: `${FROZEN}/second.wire.json`, from: WIRE, json: (w) => reseal({ ...w, label: 'second' }) },
    { file: OWN_GATE, find: FLOOR_LINE(FLOOR_NOW), to: FLOOR_LINE(FLOOR_NOW + 1) }
  ], edits: [
    { file: `${FROZEN}/second.wire.json`, remove: true },
    { file: OWN_GATE, find: 'const RETIRED_SETS = Object.freeze({});', to: "const RETIRED_SETS = Object.freeze({ second: '2026-10-15: ablation, a ruled retirement' });" },
    { file: OWN_GATE, find: FLOOR_LINE(FLOOR_NOW + 1), to: FLOOR_LINE(FLOOR_NOW) }
  ] }
];

/** Apply one arm's edits in the clone; answers the originals, or throws why it could not plant. */
function plant(arm, originals = new Map()) {
  for (const edit of arm.edits) {
    const path = join(CLONE, edit.file);
    if (!originals.has(edit.file)) originals.set(edit.file, existsSync(path) ? readFileSync(path) : null);
    if (edit.remove) {
      if (!existsSync(path)) throw new Error(`${edit.file} does not exist, so it cannot be removed`);
      rmSync(path);
      continue;
    }
    if (edit.create !== undefined) {
      if (originals.get(edit.file) !== null) throw new Error(`${edit.file} exists, so it cannot be created`);
      const made = typeof edit.create === 'function' ? edit.create(CLONE) : edit.create;
      if (typeof made !== 'string' || made.length === 0) throw new Error(`${edit.file}: the planted text is empty`);
      writeFileSync(path, made);
      continue;
    }
    // Phase 333.11.2: a rename, which the restore undoes, and a file made from
    // another, which the restore removes.
    if (edit.renameTo !== undefined) {
      const to = join(CLONE, edit.renameTo);
      if (!existsSync(path)) throw new Error(`${edit.file} does not exist, so it cannot be renamed`);
      if (!originals.has(edit.renameTo)) originals.set(edit.renameTo, existsSync(to) ? readFileSync(to) : null);
      if (originals.get(edit.renameTo) !== null) throw new Error(`${edit.renameTo} exists, so ${edit.file} cannot be renamed to it`);
      renameSync(path, to);
      continue;
    }
    if (edit.from !== undefined) {
      if (originals.get(edit.file) !== null) throw new Error(`${edit.file} exists, so it cannot be made from ${edit.from}`);
      const source = readFileSync(join(CLONE, edit.from));
      writeFileSync(path, edit.json === undefined ? source : `${JSON.stringify(edit.json(JSON.parse(source.toString('utf8'))), null, 2)}\n`);
      continue;
    }
    if (!existsSync(path)) throw new Error(`${edit.file} does not exist`);
    const text = readFileSync(path, 'utf8');
    let next;
    if (edit.json !== undefined) next = `${JSON.stringify(edit.json(JSON.parse(text)), null, 2)}\n`;
    else if (edit.bytes !== undefined) next = edit.bytes(text);
    else if (edit.re !== undefined) {
      const all = text.match(new RegExp(edit.re.source, `${edit.re.flags.replace('g', '')}g`)) ?? [];
      if (all.length !== 1) throw new Error(`${edit.file}: the pattern ${String(edit.re)} matches ${String(all.length)} time(s), not once`);
      next = text.replace(edit.re, edit.to);
    } else {
      const count = text.split(edit.find).length - 1;
      if (count !== 1) throw new Error(`${edit.file}: ${JSON.stringify(edit.find.slice(0, 60))} matches ${String(count)} time(s), not once`);
      next = text.replace(edit.find, () => edit.to);
    }
    if (next === text) throw new Error(`${edit.file}: the plant changed nothing`);
    writeFileSync(path, next);
  }
  return originals;
}

/** plant(), and when an edit cannot be planted, the edits before it put back before the error is thrown on. */
function plantWhole(arm) {
  const partial = new Map();
  try {
    return plant(arm, partial);
  } catch (err) {
    restore(partial);
    throw err;
  }
}

/** Put every planted file back, and prove it by sha256. */
function restore(originals) {
  for (const [file, bytes] of originals) {
    const path = join(CLONE, file);
    if (bytes === null) {
      if (existsSync(path)) rmSync(path);
      continue;
    }
    writeFileSync(path, bytes);
    if (sha256(readFileSync(path)) !== sha256(bytes)) throw new Error(`${file} did not restore to its sha256`);
  }
}

/**
 * The gate over the clone: this tree's gate, or (`own`) the clone's own,
 * which imports the clone's reader and holds the clone's RETIRED_SETS and
 * FROZEN_SETS_FLOOR. `extra` (Phase 333.12) is handed to it after `--json`.
 */
function gate(own = false, extra = []) {
  const script = own ? join(CLONE, 'build', 'assert-door-only-adds.mjs') : GATE;
  const run = spawnSync(process.execPath, [script, '--root', CLONE, '--json', ...extra], { cwd: CLONE, encoding: 'utf8', timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
  const line = (run.stdout ?? '').split('\n').find((l) => l.startsWith('GATE_ONLYADD:'));
  let verdict = null;
  try {
    verdict = line === undefined ? null : JSON.parse(line.slice('GATE_ONLYADD:'.length));
  } catch {
    verdict = null;
  }
  return { status: run.status, verdict, tail: `${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-4).join(' | ') };
}

/** The gate in a freeze mode over the clone; answers its status and output. */
function freeze(args) {
  const run = spawnSync(process.execPath, [GATE, '--root', CLONE, ...args], { cwd: CLONE, encoding: 'utf8', timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
  return { status: run.status, out: `${run.stdout ?? ''}${run.stderr ?? ''}` };
}

/**
 * §9's rules, driven: a freeze refuses a label that exists, `--replace`
 * refuses without `--why`, a second freeze of an unchanged tree writes the
 * same bytes, and `--replace --why` over a phone change keeps the reason and
 * the replaced seal in `history` and prints the lines that moved.
 */
/**
 * PHASE 346: THE LABEL THE FREEZE MODES FREEZE (M3 to M10), beside a copy of
 * the committed `launch` set. They froze `launch` itself into an empty
 * directory while today's routes were the launch phone's eleven; once the
 * door adds a route (Phase 346's start), a `launch` set frozen from today
 * fails R7 by design (LEGACY_ALLOWED_ROUTES is held to the LAUNCH phone's
 * routes), so the modes freeze a later set next to the launch one, which is
 * the freeze a release takes. M1 and M2 still ask about `launch` itself.
 */
const MODE = 'mode';

/** Seed `<dir>` with the committed frozen sets, then freeze {@link MODE} into it. */
function freezeFresh(dir) {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(join(CLONE, FROZEN)).filter((n) => n.endsWith('.json'))) cpSync(join(CLONE, FROZEN, name), join(dir, name));
  return freeze(['--freeze', MODE, '--into', dir]);
}

function modes() {
  const out = [];
  const a = join(CLONE, 'p33311-freeze-a');
  const b = join(CLONE, 'p33311-freeze-b');
  const m1 = freeze(['--freeze', 'launch']);
  out.push(['M1', 'a freeze over a label that exists refuses', m1.status === 1 && /exists/.test(m1.out) && !/froze launch/.test(m1.out)]);
  const m2 = freeze(['--freeze', 'launch', '--replace']);
  out.push(['M2', '--replace with no --why refuses', m2.status === 1 && /--why/.test(m2.out)]);
  const first = freezeFresh(a);
  const second = freezeFresh(b);
  const same =
    first.status === 0 && second.status === 0 &&
    [`${MODE}.wire.json`, `${MODE}.vectors.json`].every((f) => existsSync(join(a, f)) && sha256(readFileSync(join(a, f))) === sha256(readFileSync(join(b, f))));
  out.push(['M3', 'two freezes of an unchanged tree write the same bytes', same]);
  let m4 = false;
  let originals = null;
  try {
    originals = plant(ARMS.find((x) => x.id === 'C3'));
    const before = existsSync(join(a, `${MODE}.wire.json`)) ? JSON.parse(readFileSync(join(a, `${MODE}.wire.json`), 'utf8')) : null;
    const replaced = freeze(['--freeze', MODE, '--into', a, '--replace', '--why', 'ablation: the phone reads macVersion']);
    const after = JSON.parse(readFileSync(join(a, `${MODE}.wire.json`), 'utf8'));
    const last = after.history?.[after.history.length - 1];
    m4 =
      replaced.status === 0 && before !== null &&
      after.history.length === (before.history?.length ?? 0) + 1 &&
      last?.seal === before.seal && last?.why === 'ablation: the phone reads macVersion' &&
      /\+ \/types\/PocketBlockedAnswer\/fields\/macVersion/.test(replaced.out);
  } catch {
    m4 = false;
  } finally {
    if (originals !== null) restore(originals);
    rmSync(a, { recursive: true, force: true });
    rmSync(b, { recursive: true, force: true });
  }
  out.push(['M4', '--replace --why keeps the reason and the replaced seal, and prints the moved lines', m4]);
  // Phase 333.11.1 (SPEC-1 D11, §5.2): --replace refuses a LOWER Mac row,
  // prints it, and writes nothing.
  const c = join(CLONE, 'p33311-freeze-c');
  let m5 = false;
  let lowered = null;
  try {
    const fresh = freezeFresh(c);
    const before = fresh.status === 0 ? sha256(readFileSync(join(c, `${MODE}.wire.json`))) : null;
    lowered = plant({ edits: [{ file: 'src/main/pocket/door/limits.ts', find: 'say: 32_768', to: 'say: 16_384' }] });
    const refused = freeze(['--freeze', MODE, '--into', c, '--replace', '--why', 'ablation: lower']);
    m5 =
      before !== null && refused.status === 1 &&
      refused.out.includes('POCKET_WRITE_BODY_CAPS.say') && refused.out.includes('nothing was written') &&
      sha256(readFileSync(join(c, `${MODE}.wire.json`))) === before;
  } catch {
    m5 = false;
  } finally {
    if (lowered !== null) restore(lowered);
    rmSync(c, { recursive: true, force: true });
  }
  out.push(['M5', '--replace refuses a set whose Mac cap is lower, names it, and writes nothing', m5]);
  // ... and a Mac row or a bound's Mac constant that the new set would drop.
  const d = join(CLONE, 'p33311-freeze-d');
  let m6 = false;
  try {
    const fresh = freezeFresh(d);
    if (fresh.status === 0) {
      const wire = JSON.parse(readFileSync(join(d, `${MODE}.wire.json`), 'utf8'));
      wire.macLimits.push({ mac: 'P33311_ONLY_THEN', file: 'src/main/pocket/door/limits.ts', value: 1, rule: 'now>=frozen' });
      wire.bounds.find((b) => b.phone === 'PocketScreen.widest').mac.push('P33311_TOO');
      writeFileSync(join(d, `${MODE}.wire.json`), `${JSON.stringify(reseal(wire), null, 2)}\n`);
      const before = [`${MODE}.wire.json`, `${MODE}.vectors.json`].map((f) => sha256(readFileSync(join(d, f))));
      const refused = freeze(['--freeze', MODE, '--into', d, '--replace', '--why', 'ablation: missing']);
      const after = [`${MODE}.wire.json`, `${MODE}.vectors.json`].map((f) => sha256(readFileSync(join(d, f))));
      m6 =
        refused.status === 1 &&
        refused.out.includes('P33311_ONLY_THEN') && refused.out.includes('P33311_TOO') && refused.out.includes('nothing was written') &&
        canonical(before) === canonical(after);
    }
  } catch {
    m6 = false;
  } finally {
    rmSync(d, { recursive: true, force: true });
  }
  out.push(['M6', '--replace refuses a set that drops a Mac limit or a bound\'s Mac constant, names both, and writes nothing', m6]);
  // The fix round (the reverify's W16): --replace, and F1 (b) through the
  // same function, refuse a set that takes out a way the frozen phone asks.
  // A committed copy with a request record exists only once this phase
  // lands, so the request half is driven here, through `--replace`.
  out.push(['M7', '--replace refuses a set that takes out a way the frozen phone asks (a sometimes name, a nullable key, a word, a route), names each, and writes nothing', replaceRefuses('p33311-freeze-e', (wire) => {
    wire.requests.find((r) => r.route === 'sessions').query.find((q) => q.name === 'show').sent = 'sometimes';
    wire.requests.find((r) => r.route === 'end').body.fields.find((f) => f.name === 'batch').null = true;
    wire.sends.find((s) => s.phone === 'SessionsSortBy').words.push('p33311-word');
    wire.routes.push({ id: 'p33311-gone', method: 'GET', path: '/v1/p33311-gone', signed: true, windowOnly: false, reads: true, answer: wire.routes[0].answer });
  }, ['query name show', 'body key batch', 'p33311-word', '/v1/p33311-gone'])]);
  // ... and one that re-rules or loosens a bound the frozen phone held.
  out.push(['M8', '--replace refuses a set that re-rules, raises, lowers the least value of or unbounds a bound, names each, and writes nothing', replaceRefuses('p33311-freeze-f', (wire) => {
    const widest = wire.bounds.find((b) => b.phone === 'PocketScreen.widest');
    widest.value = 256;
    widest.min = 2;
    widest.applies.push('P33311.only');
    wire.bounds.find((b) => b.phone === 'PocketScreen.tallest').rule = 'equal';
  }, ['above the 256', 'least value', 'P33311.only', 'where it held the Mac by equal'])]);
  // Phase 333.11.2 (SPEC-2 D8, §5.4): --replace refuses a set whose vectors
  // drop or change a request the replaced set's own vectors hold, through
  // the vectorLosses F1 (b) asks of every committed copy ...
  out.push(['M9', '--replace refuses a set whose vectors drop a frozen request or change one\'s target, names both, and writes nothing', replaceRefuses('p33311-freeze-g', () => {}, ['p33311-gone', 'odd-id'], (vectors) => {
    vectors.requests.push({ ...vectors.requests.find((r) => r.name === 'blocked'), name: 'p33311-gone' });
    vectors.requests.find((r) => r.name === 'odd-id').target = '/v1/session?id=p33311-moved';
    return vectors;
  })]);
  // ... and refuses, writing nothing, when the replaced set's own vectors do
  // not hold together, because then what it froze cannot be compared.
  out.push(['M10', '--replace refuses a set whose own vectors do not hold together, and writes nothing', replaceRefuses('p33311-freeze-h', () => {}, ['do not hold together'], (vectors) => ({ ...vectors, about: `${String(vectors.about)} p33311` }), false)]);
  return out;
}

/**
 * Freeze {@link MODE} beside the committed `launch` set into a fresh `<dir>`
 * in the clone ({@link freezeFresh}), edit that set as the
 * one being replaced (resealed, so it is a set `--replace` reads), then
 * `--replace` it from the unchanged tree: it must exit 1, print every
 * `names` and `nothing was written`, and leave both files at their sha256.
 * `editVectors` (Phase 333.11.2) edits that set's vectors first, and the
 * wire's `vectors.sha256` is repinned to them unless `repin` is false.
 */
function replaceRefuses(dir, edit, names, editVectors = null, repin = true) {
  const at = join(CLONE, dir);
  try {
    const fresh = freezeFresh(at);
    if (fresh.status !== 0) return false;
    const wire = JSON.parse(readFileSync(join(at, `${MODE}.wire.json`), 'utf8'));
    if (editVectors !== null) {
      const path = join(at, `${MODE}.vectors.json`);
      writeFileSync(path, `${JSON.stringify(editVectors(JSON.parse(readFileSync(path, 'utf8'))), null, 2)}\n`);
      if (repin) wire.vectors.sha256 = sha256(readFileSync(path));
    }
    edit(wire);
    writeFileSync(join(at, `${MODE}.wire.json`), `${JSON.stringify(reseal(wire), null, 2)}\n`);
    const before = [`${MODE}.wire.json`, `${MODE}.vectors.json`].map((f) => sha256(readFileSync(join(at, f))));
    const refused = freeze(['--freeze', MODE, '--into', at, '--replace', '--why', `ablation: ${dir}`]);
    const after = [`${MODE}.wire.json`, `${MODE}.vectors.json`].map((f) => sha256(readFileSync(join(at, f))));
    const unnamed = names.filter((n) => !refused.out.includes(n));
    if (unnamed.length > 0) process.stdout.write(`${TAG} ${dir}: the refusal did not name ${unnamed.join(', ')}\n`);
    return refused.status === 1 && unnamed.length === 0 && refused.out.includes('nothing was written') && canonical(before) === canonical(after);
  } catch {
    return false;
  } finally {
    rmSync(at, { recursive: true, force: true });
  }
}

/**
 * Is there a committed copy of the route ledger in the clone's own
 * repository (Phase 333.12, R8g and R8gh)? Since Phase 333.11.2 the clone's
 * base commit holds the whole tree, so this is the tree holding a ledger;
 * read through the clone's own git (cloneGit), never the operator's history.
 */
function ledgerCommitted() {
  try {
    return /^[0-9a-f]{40}/m.test(cloneGit('log', '--format=%H', '--', LEDGER_END_CLAUSE.file));
  } catch {
    return false;
  }
}

function regenerate() {
  const run = spawnSync(process.execPath, [join(CLONE, 'build', 'p316', 'vectors.mjs')], { cwd: CLONE, encoding: 'utf8', timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`the clone's vectors.mjs refused to regenerate: ${`${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ')}`);
}

// One id names one arm, so `--only` and every report line name exactly one.
const ids = ARMS.map((a) => a.id);
const doubled = ids.filter((id, i) => ids.indexOf(id) !== i);
if (doubled.length > 0) {
  process.stdout.write(`${TAG} FAIL: arm id(s) used twice: ${[...new Set(doubled)].join(', ')}\n`);
  process.exit(1);
}

const t0 = Date.now();
let red = 0;
let green = 0;
let notRun = 0;
const misses = [];
const arms = ARMS.filter((a) => ONLY === null || ONLY.has(a.id));
const armCount = arms.filter((a) => !a.control).length;
const controlCount = arms.filter((a) => a.control).length;
/** Whether anything, a dangling link included, is at `path`. */
const present = (path) => {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
};
/** Set once this run has started making CLONE; only then does the `finally` remove it. */
let made = false;
try {
  mkdirSync(SCRATCH, { recursive: true });
  // THE CLONE, copy-on-write: `cp -Rc` on APFS shares every block until written.
  // It is this run's own `ablation-<pid>` directory, which must not exist yet.
  if (present(CLONE)) throw new Error(`${CLONE} already exists, so the clone would not be this run's own`);
  made = true;
  const cp = spawnSync('/bin/cp', ['-Rc', REPO, CLONE], { encoding: 'utf8', timeout: 600_000 });
  if (cp.status !== 0) throw new Error(`cp -Rc failed: ${String(cp.stderr).trim()}`);
  if (INTO !== null) {
    mkdirSync(join(CLONE, FROZEN), { recursive: true });
    for (const name of readdirSync(INTO).filter((n) => n.endsWith('.json'))) cpSync(join(INTO, name), join(CLONE, FROZEN, name));
  }
  // THE CLONE IS A REPOSITORY OF ITS OWN (SPEC-2 §5.1, D11; the fix round).
  // `cp -Rc` copies the tree's `.git` too: a worktree's FILE, which points at
  // the operator's history, or a checkout's or a `git clone`'s DIRECTORY, a
  // self-contained copy of one. Either is the CLONE's own copy, removed
  // before any git command here, which touches nothing of the original. It
  // is removed only as `.git` directly inside the `ablation-<pid>` directory
  // this run made under the scratch directory, and never followed if a link.
  const dotGit = join(CLONE, '.git');
  if (!made || dirname(dotGit) !== CLONE || dirname(CLONE) !== SCRATCH || basename(CLONE) !== `ablation-${String(process.pid)}`) {
    throw new Error(`the clone is not this run's own ablation-${String(process.pid)} under ${SCRATCH}, so its .git is not removed`);
  }
  if (present(dotGit)) {
    if (lstatSync(dotGit).isDirectory()) rmSync(dotGit, { recursive: true, force: true });
    else rmSync(dotGit);
  }
  if (present(dotGit)) throw new Error(`the clone's .git could not be removed, so the clone is not a repository of its own`);
  cloneGit('init', '-q', '-b', 'p33311');
  cloneGit('add', '-A');
  cloneGit('commit', '-q', '-m', 'p33311 ablation base');
  BASE = cloneGit('rev-parse', 'HEAD');
  process.stdout.write(`${TAG} clone at ${CLONE}, a repository of its own at ${BASE.slice(0, 8)} (${String(Math.round((Date.now() - t0) / 1000))} s); ${String(armCount)} arm(s), ${String(controlCount)} control(s)\n`);
  const base = gate();
  process.stdout.write(`${TAG} unplanted: ${base.verdict?.ok === true ? 'PASS' : `FAIL (${Object.entries(base.verdict?.clauses ?? {}).filter(([, c]) => !c.ok).map(([id]) => id).join(', ') || base.tail})`}\n`);
  if (base.verdict?.ok !== true) misses.push('the unplanted clone does not pass, so no arm below proves its own clause');
  const vectorsBefore = readFileSync(join(CLONE, VECTORS));
  for (const arm of arms) {
    const started = Date.now();
    let originals = null;
    let line;
    // PHASE 333.12 (R8g, R8gh): an arm that reads the committed copies of the
    // route ledger has nothing to read when the clone's base commit holds
    // none. It says so, and is neither a pass nor a fail.
    if (arm.committedLedger === true && !ledgerCommitted()) {
      notRun += 1;
      process.stdout.write(`  not run ${arm.id}  ${arm.what}: no committed copy of the ledger\n`);
      continue;
    }
    try {
      if (arm.commit !== undefined) {
        // A HISTORY arm (SPEC-2 §5.2): its plant committed as a second commit.
        plant({ edits: arm.commit });
        cloneGit('add', '-A');
        cloneGit('commit', '-q', '-m', `plant ${arm.id}`);
      }
      originals = plantWhole(arm);
      if (arm.regen) regenerate();
      const r = gate(arm.reader === true || arm.own === true, arm.args ?? []);
      const reds = Object.entries(r.verdict?.clauses ?? {}).filter(([id, c]) => !c.ok && id !== 'P4').map(([id]) => id);
      if (arm.reader === true) {
        // Red before any clause: the reader's own fixtures refused it, and
        // (when the arm names one) the fixture that proves the rule it broke.
        const fixtures = r.verdict?.fixtures ?? [];
        const named = arm.fixture === undefined ? fixtures : fixtures.filter((f) => f.startsWith(`${arm.fixture}.`));
        if (r.verdict !== null && r.verdict.ok === false && named.length > 0) {
          red += 1;
          line = `  red  ${arm.id}  ${arm.what} (its fixtures: ${named[0].split(':')[0]})`;
        } else {
          misses.push(`${arm.id}: the reader's fixtures did not refuse it${arm.fixture === undefined ? '' : ` on ${arm.fixture}`} (${fixtures.length > 0 ? fixtures.map((f) => f.split(':')[0]).join(', ') : r.tail})`);
          line = `  MISS ${arm.id}  ${arm.what}: ${fixtures.length > 0 ? `refused on ${fixtures.map((f) => f.split(':')[0]).join(', ')} only` : 'the fixtures passed'}`;
        }
      } else if (r.verdict === null) {
        misses.push(`${arm.id}: the gate gave no verdict (${r.tail})`);
        line = `  MISS ${arm.id}  ${arm.what}: no verdict`;
      } else if (arm.control) {
        if (r.verdict.ok) {
          green += 1;
          line = `  green ${arm.id}  ${arm.what}`;
        } else {
          misses.push(`${arm.id}: a control read red (${reds.join(', ')})`);
          line = `  MISS ${arm.id}  ${arm.what}: red on ${reds.join(', ')}: ${(r.verdict.clauses[reds[0]]?.findings ?? []).slice(0, 2).join(' / ')}`;
        }
      } else {
        const owned = r.verdict.clauses[arm.clause]?.ok === false;
        const stayed = (arm.alsoGreen ?? []).filter((id) => r.verdict.clauses[id]?.ok !== true);
        // Phase 333.11.1: an arm held by two clauses must read red on both,
        // so each is proved to hold the plant on its own.
        const unheld = (arm.alsoRed ?? []).filter((id) => r.verdict.clauses[id]?.ok !== false);
        if (owned && stayed.length === 0 && unheld.length === 0) {
          red += 1;
          line = `  red  ${arm.id}  ${arm.what} (red: ${reds.join(', ')}${arm.alsoGreen ? `; green as it must be: ${arm.alsoGreen.join(', ')}` : ''})`;
        } else {
          const why = !owned ? `${arm.clause} stayed green` : stayed.length > 0 ? `${stayed.join(', ')} went red too` : `${unheld.join(', ')} stayed green beside ${arm.clause}`;
          misses.push(`${arm.id}: ${why} (red: ${reds.join(', ') || 'none'})`);
          line = `  MISS ${arm.id}  ${arm.what}: ${why}`;
        }
      }
    } catch (err) {
      misses.push(`${arm.id}: ${String(err.message)}`);
      line = `  MISS ${arm.id}  ${arm.what}: ${String(err.message)}`;
    } finally {
      // A history arm is put back by a reset to BASE, which throws (and so
      // stops the run) when the clone does not come back clean.
      if (arm.commit !== undefined) resetToBase();
      else if (originals !== null) restore(originals);
      if (arm.regen) {
        writeFileSync(join(CLONE, VECTORS), vectorsBefore);
        if (sha256(readFileSync(join(CLONE, VECTORS))) !== sha256(vectorsBefore)) misses.push(`${arm.id}: vectors.json did not restore`);
      }
    }
    process.stdout.write(`${line} (${String(Math.round((Date.now() - started) / 100) / 10)} s)\n`);
  }
  if (ONLY === null) {
    for (const [id, what, ok] of modes()) {
      process.stdout.write(`  ${ok ? 'held' : 'MISS'} ${id}  ${what}\n`);
      if (!ok) misses.push(`${id}: ${what}, and it did not`);
    }
  }
  // Once, after the last arm and mode: the clone is back at BASE, clean.
  const status = cloneGit('status', '--porcelain');
  const head = cloneGit('rev-parse', 'HEAD');
  if (status !== '' || head !== BASE) misses.push(`the clone is not back at its base commit after the last arm and mode (HEAD ${head.slice(0, 8)}${status === '' ? '' : `, status: ${status.split('\n').slice(0, 3).join(' | ')}`})`);
  else process.stdout.write(`${TAG} the clone is back at ${BASE.slice(0, 8)}, git status empty\n`);
} catch (err) {
  misses.push(String(err.message));
} finally {
  if (made) rmSync(CLONE, { recursive: true, force: true });
}
process.stdout.write(`ABLATION_P33311: ${String(red)}/${String(armCount - notRun)} red, ${String(green)}/${String(controlCount)} controls green${notRun > 0 ? `, ${String(notRun)} not run` : ''} (${String(Math.round((Date.now() - t0) / 1000))} s)\n`);
if (misses.length > 0) {
  process.stdout.write(`${TAG} FAIL:\n`);
  for (const m of misses) process.stdout.write(`  - ${m}\n`);
  process.exit(1);
}
process.exit(0);
