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
 * `git` IS REQUIRED. The clone is a `cp -Rc` of the tree, so its `.git` file
 * reaches the same history, and F1 compares the clone's frozen set with
 * every committed copy of it. With no `git` the gate only notes it, so G6 and
 * the `alsoRed` halves read MISS and the run fails, never passes.
 *
 * Between arms every planted file is put back and its sha256 compared with
 * the original, so no arm sees another's plant. The clone is removed in a
 * `finally`, whatever happened. Every process it starts it waits for
 * (`spawnSync`), so nothing outlives it.
 *
 *   node build/p33311/ablation.mjs [--scratch <dir>] [--into <dir>] [--only id,id]
 *
 * `--scratch` is where the clone is made (default: the OS temporary
 * directory, or `P33311_SCRATCH`); `--into` copies a directory of frozen sets
 * into the clone's `ios/TortieTests/Fixtures/frozen/` first (a builder's
 * scratch set before the integrator freezes); `--only` runs the named arms.
 * It prints one line per arm and `ABLATION_P33311: <red>/<arms> red,
 * <green>/<controls> controls green` (71 arms and 12 controls, and modes M1
 * to M8, since Phase 333.11.1's fix round); any arm that does not read as it
 * must exits 1.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
 * `{ file, bytes: (text) => text }`; `edits: []` plants nothing (Z0).
 * `regen` regenerates the clone's vectors after the plant. `alsoGreen` names
 * clauses that must stay green, `alsoRed` clauses that must read red beside
 * the arm's own (Phase 333.11.1: each of the two holds the plant alone).
 * A reader arm's `fixture` names the fixture whose proof must refuse it.
 */

/** A frozen set's `macLimits` row, by its Mac constant. */
const limitRow = (w, mac) => w.macLimits.find((r) => r.mac === mac);
/** A frozen set's request record, by its route id. */
const recordOf = (w, route) => w.requests.find((r) => r.route === route);
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
  // Controls: adding is allowed
  { id: 'C1', control: true, what: 'the Mac adds macVersion?: string to PocketBlockedAnswer and the blocked composer sends it', regen: true, edits: [
    { file: 'src/shared/ipc/pocket.ts', find: 'one spelling, handed over rather than spelled by a client.\n   */\n  ageNote: string;', to: 'one spelling, handed over rather than spelled by a client.\n   */\n  ageNote: string;\n  macVersion?: string;' },
    { file: 'src/main/pocket/routes.ts', find: '        emptyLine: facts.emptyLine,\n', to: "        emptyLine: facts.emptyLine,\n        macVersion: '0.110.0',\n" }
  ] },
  { id: 'C2', control: true, what: 'the Mac adds a GET row /v1/probe with a new id', edits: [
    { file: 'src/main/pocket/door/table.ts', find: "  { id: 'scrollback', method: 'GET', path: '/v1/scrollback', reads: true, windowOnly: false, signed: true },\n", to: "  { id: 'scrollback', method: 'GET', path: '/v1/scrollback', reads: true, windowOnly: false, signed: true },\n  { id: 'probe', method: 'GET', path: '/v1/probe', reads: true, windowOnly: false, signed: true },\n" },
    { file: 'src/shared/ipc/pocket.ts', find: "  'scrollback'\n] as const;", to: "  'scrollback',\n  'probe'\n] as const;" }
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
  { id: 'V5', control: true, what: 'the turns arm refuses a query with no limit, which the phone always sends', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return id === null\n              ? null\n              : await routes.turns(', to: "return id === null || query.get('limit') === null\n              ? null\n              : await routes.turns(" }] },
  { id: 'V6', control: true, what: 'the sessions arm refuses a query missing show, group or sort, which the phone always sends', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.sessions(query);', to: "return query.get('show') === null || query.get('group') === null || query.get('sort') === null ? null : routes.sessions(query);" }] },
  { id: 'V7', control: true, what: 'the sessions arm refuses show=archived, which the phone never sends', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.sessions(query);', to: "return query.get('show') === 'archived' ? null : routes.sessions(query);" }] },
  { id: 'V8', control: true, what: 'the scrollback arm refuses a query with no keep, which the phone always sends', edits: [{ file: 'src/main/pocket/ipc.ts', find: 'return routes.scrollback(query, closing);', to: "return query.get('keep') === null ? null : routes.scrollback(query, closing);" }] },
  { id: 'G2', control: true, what: 'the Mac raises POCKET_WRITE_BODY_CAPS.say to 65_536', edits: [{ file: 'src/main/pocket/door/limits.ts', find: 'say: 32_768', to: 'say: 65_536' }] }
];

/** Apply one arm's edits in the clone; answers the originals, or throws why it could not plant. */
function plant(arm) {
  const originals = new Map();
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
      writeFileSync(path, edit.create);
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

/** The gate over the clone: this tree's gate, or (`own`) the clone's own, which imports the clone's reader. */
function gate(own = false) {
  const script = own ? join(CLONE, 'build', 'assert-door-only-adds.mjs') : GATE;
  const run = spawnSync(process.execPath, [script, '--root', CLONE, '--json'], { cwd: CLONE, encoding: 'utf8', timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
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
function modes() {
  const out = [];
  const a = join(CLONE, 'p33311-freeze-a');
  const b = join(CLONE, 'p33311-freeze-b');
  const m1 = freeze(['--freeze', 'launch']);
  out.push(['M1', 'a freeze over a label that exists refuses', m1.status === 1 && /exists/.test(m1.out) && !/froze launch/.test(m1.out)]);
  const m2 = freeze(['--freeze', 'launch', '--replace']);
  out.push(['M2', '--replace with no --why refuses', m2.status === 1 && /--why/.test(m2.out)]);
  const first = freeze(['--freeze', 'launch', '--into', a]);
  const second = freeze(['--freeze', 'launch', '--into', b]);
  const same =
    first.status === 0 && second.status === 0 &&
    ['launch.wire.json', 'launch.vectors.json'].every((f) => existsSync(join(a, f)) && sha256(readFileSync(join(a, f))) === sha256(readFileSync(join(b, f))));
  out.push(['M3', 'two freezes of an unchanged tree write the same bytes', same]);
  let m4 = false;
  let originals = null;
  try {
    originals = plant(ARMS.find((x) => x.id === 'C3'));
    const before = existsSync(join(a, 'launch.wire.json')) ? JSON.parse(readFileSync(join(a, 'launch.wire.json'), 'utf8')) : null;
    const replaced = freeze(['--freeze', 'launch', '--into', a, '--replace', '--why', 'ablation: the phone reads macVersion']);
    const after = JSON.parse(readFileSync(join(a, 'launch.wire.json'), 'utf8'));
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
    const fresh = freeze(['--freeze', 'launch', '--into', c]);
    const before = fresh.status === 0 ? sha256(readFileSync(join(c, 'launch.wire.json'))) : null;
    lowered = plant({ edits: [{ file: 'src/main/pocket/door/limits.ts', find: 'say: 32_768', to: 'say: 16_384' }] });
    const refused = freeze(['--freeze', 'launch', '--into', c, '--replace', '--why', 'ablation: lower']);
    m5 =
      before !== null && refused.status === 1 &&
      refused.out.includes('POCKET_WRITE_BODY_CAPS.say') && refused.out.includes('nothing was written') &&
      sha256(readFileSync(join(c, 'launch.wire.json'))) === before;
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
    const fresh = freeze(['--freeze', 'launch', '--into', d]);
    if (fresh.status === 0) {
      const wire = JSON.parse(readFileSync(join(d, 'launch.wire.json'), 'utf8'));
      wire.macLimits.push({ mac: 'P33311_ONLY_THEN', file: 'src/main/pocket/door/limits.ts', value: 1, rule: 'now>=frozen' });
      wire.bounds.find((b) => b.phone === 'PocketScreen.widest').mac.push('P33311_TOO');
      writeFileSync(join(d, 'launch.wire.json'), `${JSON.stringify(reseal(wire), null, 2)}\n`);
      const before = ['launch.wire.json', 'launch.vectors.json'].map((f) => sha256(readFileSync(join(d, f))));
      const refused = freeze(['--freeze', 'launch', '--into', d, '--replace', '--why', 'ablation: missing']);
      const after = ['launch.wire.json', 'launch.vectors.json'].map((f) => sha256(readFileSync(join(d, f))));
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
  return out;
}

/**
 * Freeze `launch` into a fresh `<dir>` in the clone, edit that set as the
 * one being replaced (resealed, so it is a set `--replace` reads), then
 * `--replace` it from the unchanged tree: it must exit 1, print every
 * `names` and `nothing was written`, and leave both files at their sha256.
 */
function replaceRefuses(dir, edit, names) {
  const at = join(CLONE, dir);
  try {
    const fresh = freeze(['--freeze', 'launch', '--into', at]);
    if (fresh.status !== 0) return false;
    const wire = JSON.parse(readFileSync(join(at, 'launch.wire.json'), 'utf8'));
    edit(wire);
    writeFileSync(join(at, 'launch.wire.json'), `${JSON.stringify(reseal(wire), null, 2)}\n`);
    const before = ['launch.wire.json', 'launch.vectors.json'].map((f) => sha256(readFileSync(join(at, f))));
    const refused = freeze(['--freeze', 'launch', '--into', at, '--replace', '--why', `ablation: ${dir}`]);
    const after = ['launch.wire.json', 'launch.vectors.json'].map((f) => sha256(readFileSync(join(at, f))));
    const unnamed = names.filter((n) => !refused.out.includes(n));
    if (unnamed.length > 0) process.stdout.write(`${TAG} ${dir}: the refusal did not name ${unnamed.join(', ')}\n`);
    return refused.status === 1 && unnamed.length === 0 && refused.out.includes('nothing was written') && canonical(before) === canonical(after);
  } catch {
    return false;
  } finally {
    rmSync(at, { recursive: true, force: true });
  }
}

function regenerate() {
  const run = spawnSync(process.execPath, [join(CLONE, 'build', 'p316', 'vectors.mjs')], { cwd: CLONE, encoding: 'utf8', timeout: 180_000, maxBuffer: 32 * 1024 * 1024 });
  if (run.status !== 0) throw new Error(`the clone's vectors.mjs refused to regenerate: ${`${run.stdout ?? ''}${run.stderr ?? ''}`.trim().split('\n').slice(-3).join(' | ')}`);
}

const t0 = Date.now();
let red = 0;
let green = 0;
const misses = [];
const arms = ARMS.filter((a) => ONLY === null || ONLY.has(a.id));
const armCount = arms.filter((a) => !a.control).length;
const controlCount = arms.filter((a) => a.control).length;
try {
  mkdirSync(SCRATCH, { recursive: true });
  // THE CLONE, copy-on-write: `cp -Rc` on APFS shares every block until written.
  const cp = spawnSync('/bin/cp', ['-Rc', REPO, CLONE], { encoding: 'utf8', timeout: 600_000 });
  if (cp.status !== 0) throw new Error(`cp -Rc failed: ${String(cp.stderr).trim()}`);
  if (INTO !== null) {
    mkdirSync(join(CLONE, FROZEN), { recursive: true });
    for (const name of readdirSync(INTO).filter((n) => n.endsWith('.json'))) cpSync(join(INTO, name), join(CLONE, FROZEN, name));
  }
  process.stdout.write(`${TAG} clone at ${CLONE} (${String(Math.round((Date.now() - t0) / 1000))} s); ${String(armCount)} arm(s), ${String(controlCount)} control(s)\n`);
  const base = gate();
  process.stdout.write(`${TAG} unplanted: ${base.verdict?.ok === true ? 'PASS' : `FAIL (${Object.entries(base.verdict?.clauses ?? {}).filter(([, c]) => !c.ok).map(([id]) => id).join(', ') || base.tail})`}\n`);
  if (base.verdict?.ok !== true) misses.push('the unplanted clone does not pass, so no arm below proves its own clause');
  const vectorsBefore = readFileSync(join(CLONE, VECTORS));
  for (const arm of arms) {
    const started = Date.now();
    let originals = null;
    let line;
    try {
      originals = plant(arm);
      if (arm.regen) regenerate();
      const r = gate(arm.reader === true);
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
      if (originals !== null) restore(originals);
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
} catch (err) {
  misses.push(String(err.message));
} finally {
  rmSync(CLONE, { recursive: true, force: true });
}
process.stdout.write(`ABLATION_P33311: ${String(red)}/${String(armCount)} red, ${String(green)}/${String(controlCount)} controls green (${String(Math.round((Date.now() - t0) / 1000))} s)\n`);
if (misses.length > 0) {
  process.stdout.write(`${TAG} FAIL:\n`);
  for (const m of misses) process.stdout.write(`  - ${m}\n`);
  process.exit(1);
}
process.exit(0);
