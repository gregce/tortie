/**
 * swift-wire.mjs. THE READER OF THE PHONE'S WIRE (Phase 333.11,
 * build/p33311/SPEC.md §5).
 *
 * WHAT IT IS FOR. The launch phone in strangers' hands will decode the Mac's
 * answers the same way for as long as it is installed, so `gate:onlyadd`
 * freezes what that phone REQUIRES of every answer. The requirement is read
 * HERE, from the phone's own Swift decoders, and never guessed from the Mac's
 * composer (D1): which keys an answer must carry, which may be null, of what
 * kind, which words a closed set accepts, which cases a discriminated object
 * has, the bounds the phone holds the Mac to and the words it sends.
 *
 * HOW IT READS. Every `.swift` under `ios/Tortie/` is lexed once by the one
 * Swift lexer (`../swift-lex.mjs`, conformance:ios's own), types are
 * module-global, and only the decoders REACHABLE from the route roots in
 * `Door/DoorClient.swift` and from the QR (`PairingOffer.parse`'s `Wire`, with
 * its `Marker` pre-read held to asking nothing more, since Phase 333.1) are
 * classified. It understands exactly the idioms of §5.2:
 *
 *   1. `enum CodingKeys: String, CodingKey { case a, b; case x = "y" }`;
 *   2. `init(from decoder: Decoder) throws` on a type or an extension, its
 *      container `let <any name> = try decoder.container(keyedBy: CodingKeys.self)`;
 *   3. on that container, anywhere in a statement: `decode`, `nullable`,
 *      `doorNumber`, `nullableDoorNumber`, `decodeIfPresent`, `screenColor`
 *      (each preceded by a plain `try`), and `contains` as an `if` condition
 *      (the key optional in its branch) or `guard !c.contains(.k)` (the key
 *      absent in its case); `try X(from: decoder)` is a flatten;
 *   4. one discriminant, a `String` read switched on inline or bound first,
 *      its case labels literals or `Word.x` constants, `if w == "x"` narrowing
 *      inside a case, a `default:` that throws (closed) or assigns (open);
 *   5. a key read twice merges (presence the strongest, null when any read
 *      takes it, kind the narrowest non-null one's);
 *   6. a `guard … else { throw … }` with no read in it is a relation (D14);
 *   7. a synthesized `Decodable` (stored properties, `T?` optional);
 *   8. `enum E: String, … { case a; case b = "B" }` as a closed word set;
 *   9. constants: an integer literal (with `_`), a product or sum of them, a
 *      `TimeInterval` literal, a `Set<Int>` or array literal.
 *
 * ANYTHING ELSE inside a reachable decoder is an UNREAD STATEMENT, reported
 * with its file and line, and P0 turns the gate red on it: a reader that
 * silently skipped a new idiom would freeze a phone that requires more than
 * the file says. `try?`/`try!` on a container read, a loop, a `do`, a call on
 * the container this reader does not know, a key not in `CodingKeys`, the
 * decoder or the container handed anywhere else: all unread.
 *
 * ITS OWN PROOF FIRST (§5.6). `proveReader(dir)` reads every
 * `build/p33311/fixtures/*.swift.txt` beside its `*.expect.json`; the gate and
 * test:ios run it before they trust a projection.
 *
 * THE CURATED ROWS. The formats and bounds of §5.5 are the one part a
 * decoder statement cannot say (a predicate a relation asks, a constant a
 * relation compares with). Each is a row below naming the Swift it mirrors;
 * the constant's VALUE is read from the Swift, and the gate seals the rows
 * into the frozen file, so a later edit of this table never weakens a frozen
 * set.
 *
 * Plain node: it imports `node:crypto`, `node:fs`, `node:path` and the lexer,
 * and nothing else, so `build/p316/test-ios.mjs` imports it with no tsx.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { lexSwift } from '../swift-lex.mjs';

/** The interpolation mark `lexSwift` puts in a string's static value. */
const HOLE = String.fromCharCode(0xfffc);

// ---------------------------------------------------------------------------
// The curated rows (§5.5), each naming the Swift it mirrors
// ---------------------------------------------------------------------------

/**
 * The bounds the phone holds the Mac to (§2.4). `phone` is the Swift constant
 * whose value is read; `applies` the wire paths (`Type.key`, wire keys) it
 * bounds on an instance, `measure` how (`value`, an array's `length`, an
 * answer's `bytes`, a certificate's `decoded` bytes); `mac` the Mac's
 * constants held against it by `rule`, in `macFile`.
 */
export const BOUND_ROWS = Object.freeze([
  { phone: 'PocketScreen.widest', applies: ['PocketScreen.cols', 'PocketScrollbackAnswer.wrap'], measure: 'value', min: 1, mac: ['POCKET_SCREEN_MAX_COLS'], macFile: 'src/shared/ipc/pocket.ts', rule: 'mac<=phone', swift: 'PocketScreen.holdsTogether' },
  { phone: 'PocketScreen.tallest', applies: ['PocketScreen.rows'], measure: 'value', min: 1, mac: ['POCKET_SCREEN_MAX_ROWS'], macFile: 'src/shared/ipc/pocket.ts', rule: 'mac<=phone', swift: 'PocketScreen.holdsTogether' },
  { phone: 'PocketScreen.mostStyles', applies: ['PocketScreen.styles', 'PocketScrollbackAnswer.styles'], measure: 'length', min: 0, mac: ['POCKET_SCREEN_MAX_STYLES'], macFile: 'src/shared/ipc/pocket.ts', rule: 'mac<=phone', swift: 'PocketScreen.holdsTogether' },
  { phone: 'PocketScreen.deepest', applies: ['PocketScreen.depth', 'PocketScrollbackAnswer.from', 'PocketScrollbackAnswer.depth'], measure: 'value', min: 0, mac: ['POCKET_SCROLLBACK_MAX_INDEX'], macFile: 'src/shared/ipc/pocket.ts', rule: 'mac<=phone', swift: 'PocketScrollbackAnswer.holdsTogether' },
  { phone: 'PocketScrollbackAnswer.mostRows', applies: ['PocketScrollbackAnswer.rows'], measure: 'length', min: 0, mac: ['POCKET_SCROLLBACK_MAX_COUNT'], macFile: 'src/shared/ipc/pocket.ts', rule: 'mac<=phone', swift: 'PocketScrollbackAnswer.holdsTogether' },
  { phone: 'DoorLimits.answerCap', applies: ['answer'], measure: 'bytes', min: 0, mac: ['POCKET_SCREEN_MAX_BYTES', 'POCKET_SESSIONS_BUDGET_BYTES'], macFile: 'src/shared/ipc/pocket.ts', rule: 'mac<=phone', swift: 'DoorHTTP' },
  { phone: 'DoorLimits.timeout', applies: [], measure: 'seconds', min: 0, mac: ['SCREEN_HOLD_MS'], macFile: 'src/main/screen/watch.ts', rule: 'mac<phone*1000', swift: 'DoorLimits.standard' },
  { phone: 'PairingOffer.version', applies: [], measure: 'value', min: 0, mac: ['POCKET_QR_VERSION'], macFile: 'src/main/pocket/pairing.ts', rule: 'equal', swift: 'PairingOffer.parse' },
  { phone: 'DoorEndpoint.publicPorts', applies: [], measure: 'value', min: 0, mac: ['POCKET_PUBLIC_PORTS'], macFile: 'src/shared/ipc/pocket.ts', rule: 'mac-in-phone', swift: 'PairingOffer.parse' },
  { phone: 'PairAnswer.certificateCap', applies: ['PairAnswer.cert'], measure: 'decoded', min: 1, mac: [], macFile: null, rule: 'instance<=phone', swift: 'PairAnswer.init' },
  { phone: 'PairingOffer.maxPayloadBytes', applies: ['qr'], measure: 'bytes', min: 1, mac: [], macFile: null, rule: 'instance<=phone', swift: 'PairingOffer.parse' }
]);

/**
 * The formats the phone refuses an answer on (§5.5): `type.key` (wire key),
 * in `case` when the type is discriminated, held by the Swift `swift` names.
 */
export const FORMAT_ROWS = Object.freeze([
  { type: 'PocketScreenAnswer', key: 'revision', format: 'mark', swift: 'PocketReplyOffer.isMark' },
  { type: 'PocketScreen', key: 'dialog', format: 'mark', swift: 'PocketReplyOffer.isMark' },
  { type: 'PocketScreen', key: 'space', format: 'mark', swift: 'PocketReplyOffer.isMark' },
  { type: 'PocketScrollbackAnswer', key: 'space', format: 'mark', swift: 'PocketReplyOffer.isMark' },
  { type: 'PocketScreen', key: 'turn', format: 'questionId', swift: 'PocketReplyOffer.isQuestionId' },
  { type: 'PairAnswer', key: 'cert', case: 'allowed', format: 'certificate', swift: 'Base64URL.decode' },
  { type: 'PairingOffer.Wire', key: 'v', format: 'version', swift: 'PairingOffer.version' },
  { type: 'PairingOffer.Wire', key: 'port', format: 'port', swift: 'DoorEndpoint.publicPorts' },
  { type: 'PairingOffer.Wire', key: 'host', format: 'publicName', swift: 'DoorEndpoint.isPublicName' },
  { type: 'PairingOffer.Wire', key: 'fp', format: 'pin', swift: 'Base64URL.decode' },
  { type: 'PairingOffer.Wire', key: 'dk', format: 'ed25519Spki', swift: 'SPKI.ed25519Key' },
  { type: 'PairingOffer.Wire', key: 'dx', format: 'x25519Spki', swift: 'SPKI.x25519Key' },
  { type: 'PairingOffer.Wire', key: 'ps', format: 'secret', swift: 'Base64URL.decode' },
  { type: 'PairingOffer.Wire', key: 'exp', format: 'positive', swift: 'PairingOffer.parse' }
]);

/**
 * The words the phone SENDS, each a Swift enum's raw values, and the Mac
 * list or union that must keep reading every one of them (`macForm`).
 */
export const SEND_ROWS = Object.freeze([
  { phone: 'SessionsShow', mac: 'POCKET_SESSIONS_SHOW', macFile: 'src/shared/ipc/pocket.ts', macForm: 'array' },
  { phone: 'SessionsGroupBy', mac: 'POCKET_SESSIONS_GROUP', macFile: 'src/shared/ipc/pocket.ts', macForm: 'array' },
  { phone: 'SessionsSortBy', mac: 'POCKET_SESSIONS_SORT', macFile: 'src/shared/ipc/pocket.ts', macForm: 'array' },
  { phone: 'ScrollbackKeep', mac: 'PocketScrollbackKeep', macFile: 'src/shared/ipc/pocket.ts', macForm: 'union' },
  { phone: 'ScreenKeyName', mac: 'POCKET_SCREEN_KEY_NAMES', macFile: 'src/shared/ipc/pocket.ts', macForm: 'array' }
]);

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const OPS3 = ['...', '..<', '===', '!=='];
const OPS2 = ['==', '!=', '&&', '||', '??', '->', '<=', '>=', '+=', '-=', '*=', '/='];

function lineStartsOf(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}

/** Lex one file into tokens over its `bare` text, strings read back from the lexer. */
function sourceOf(path, text) {
  const { code, bare, strings } = lexSwift(text);
  const stringAt = new Map(strings.map((s) => [s.start, s]));
  const starts = lineStartsOf(text);
  const lineOf = (at) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= at) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const src = { path, text, code, bare, stringAt, lineOf };
  src.toks = tokenize(src);
  src.match = matchOf(src.toks);
  return src;
}

function tokenize(src) {
  const { bare } = src;
  const toks = [];
  const n = bare.length;
  let i = 0;
  while (i < n) {
    const c = bare[i];
    if (c === '\n') {
      toks.push({ t: 'nl', v: '\n', at: i });
      i += 1;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') {
      i += 1;
      continue;
    }
    if (c === '"' || (c === '#' && /^#+"/.test(bare.slice(i, i + 8)))) {
      const s = src.stringAt.get(i);
      if (s !== undefined) {
        toks.push({ t: 'str', v: s.value, at: i, interpolated: s.interpolated });
        i = s.end;
        continue;
      }
    }
    if (c === '`') {
      const close = bare.indexOf('`', i + 1);
      if (close > i) {
        toks.push({ t: 'id', v: bare.slice(i + 1, close), at: i });
        i = close + 1;
        continue;
      }
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(bare[j])) j += 1;
      let v = bare.slice(i, j);
      if (v === 'try' && (bare[j] === '?' || bare[j] === '!')) {
        v += bare[j];
        j += 1;
      }
      toks.push({ t: 'id', v, at: i });
      i = j;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9A-Za-z_.]/.test(bare[j])) {
        if (bare[j] === '.' && !/[0-9]/.test(bare[j + 1] ?? '')) break;
        j += 1;
      }
      toks.push({ t: 'num', v: bare.slice(i, j), at: i });
      i = j;
      continue;
    }
    const three = bare.slice(i, i + 3);
    const two = bare.slice(i, i + 2);
    if (OPS3.includes(three)) {
      toks.push({ t: 'op', v: three, at: i });
      i += 3;
      continue;
    }
    if (OPS2.includes(two)) {
      toks.push({ t: 'op', v: two, at: i });
      i += 2;
      continue;
    }
    toks.push({ t: 'op', v: c, at: i });
    i += 1;
  }
  return toks;
}

/** For every `(`, `[` and `{`, the index of the token that closes it. */
function matchOf(toks) {
  const match = new Array(toks.length).fill(-1);
  const stack = [];
  const pair = { ')': '(', ']': '[', '}': '{' };
  for (let i = 0; i < toks.length; i += 1) {
    const t = toks[i];
    if (t.t !== 'op') continue;
    if (t.v === '(' || t.v === '[' || t.v === '{') stack.push(i);
    else if (t.v in pair) {
      // Pop to the nearest opener of the same kind; a stray closer is ignored.
      for (let k = stack.length - 1; k >= 0; k -= 1) {
        if (toks[stack[k]].v === pair[t.v]) {
          match[stack[k]] = i;
          match[i] = stack[k];
          stack.length = k;
          break;
        }
      }
    }
  }
  return match;
}

const isOp = (t, v) => t !== undefined && t.t === 'op' && t.v === v;
const isId = (t, v) => t !== undefined && t.t === 'id' && (v === undefined || t.v === v);

/** The tokens of [from, to) with every newline taken out. */
const solid = (toks, from, to) => toks.slice(from, to).filter((t) => t.t !== 'nl');

/** `a.b.c` from tokens, or null. */
function dotted(ts) {
  if (ts.length === 0 || !isId(ts[0])) return null;
  let name = ts[0].v;
  let i = 1;
  while (i < ts.length) {
    if (!isOp(ts[i], '.') || !isId(ts[i + 1])) return null;
    name += `.${ts[i + 1].v}`;
    i += 2;
  }
  return name;
}

/** Split a token list at its top-level commas. */
function splitCommas(ts) {
  const out = [[]];
  let depth = 0;
  for (const t of ts) {
    if (t.t === 'op' && (t.v === '(' || t.v === '[' || t.v === '{')) depth += 1;
    if (t.t === 'op' && (t.v === ')' || t.v === ']' || t.v === '}')) depth -= 1;
    if (depth === 0 && isOp(t, ',')) out.push([]);
    else out[out.length - 1].push(t);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Statements: just enough of a parser to walk an init body
// ---------------------------------------------------------------------------

const CONTINUES_AFTER = new Set(['=', '==', '!=', '&&', '||', '??', '+', '-', '*', '/', ',', '.', ':', '?', '->', '<', '>', '<=', '>=', '!', '...', '..<', '(', '[']);
const CONTINUES_BEFORE = new Set(['.', '?', '??', '&&', '||', '==', '!=', ':', '+', '*', '/', '->', '...', '..<']);
const CONTINUES_AFTER_WORD = new Set(['try', 'try?', 'try!', 'await', 'as', 'is']);

/** The end (exclusive) of the expression starting at `i`, stopping where `stop` says. */
function readExpr(toks, match, i, end, stop) {
  let j = i;
  let last = null;
  while (j < end) {
    const t = toks[j];
    if (stop !== undefined && stop(t)) break;
    if (t.t === 'op' && (t.v === '(' || t.v === '[' || t.v === '{') && match[j] > j) {
      j = match[j] + 1;
      last = toks[j - 1];
      continue;
    }
    if (isOp(t, '}') || isOp(t, ';')) break;
    if (t.t === 'nl') {
      let next = j + 1;
      while (next < end && toks[next].t === 'nl') next += 1;
      const after = last !== null && ((last.t === 'op' && CONTINUES_AFTER.has(last.v)) || (last.t === 'id' && CONTINUES_AFTER_WORD.has(last.v)));
      const before = next < end && toks[next].t === 'op' && CONTINUES_BEFORE.has(toks[next].v);
      if (after || before) {
        j = next;
        continue;
      }
      break;
    }
    last = t;
    j += 1;
  }
  return j;
}

/**
 * The end (exclusive) of a type annotation: it stops at `=`, `{`, `;`, `}` or
 * a newline at depth 0, never continuing past a trailing `?`, which in a
 * type is `Optional` and not an operator.
 */
function readType(toks, match, i, end) {
  let j = i;
  while (j < end) {
    const t = toks[j];
    if (t.t === 'nl' || isOp(t, '=') || isOp(t, '{') || isOp(t, ';') || isOp(t, '}')) break;
    if ((isOp(t, '(') || isOp(t, '[')) && match[j] > j) {
      j = match[j] + 1;
      continue;
    }
    j += 1;
  }
  return j;
}

const LOOP_WORDS = new Set(['for', 'while', 'repeat', 'do', 'defer', 'catch', 'break', 'continue', 'fallthrough']);

function nextSolid(toks, j, end) {
  while (j < end && toks[j].t === 'nl') j += 1;
  return j;
}

/** Statements of [i, end). `clause` stops at a `case`/`default` (a switch arm's end). */
function parseBlock(src, i, end, clause = false) {
  const { toks } = src;
  const stmts = [];
  for (;;) {
    while (i < end && (toks[i].t === 'nl' || isOp(toks[i], ';'))) i += 1;
    if (i >= end) break;
    if (clause && (isId(toks[i], 'case') || isId(toks[i], 'default') || isOp(toks[i], '@'))) break;
    const parsed = parseStatement(src, i, end);
    stmts.push(parsed.node);
    i = Math.max(parsed.i, i + 1);
  }
  return { stmts, i };
}

function parseStatement(src, i, end) {
  const { toks, match } = src;
  const t = toks[i];
  const line = src.lineOf(t.at);
  if (isId(t, 'let') || isId(t, 'var')) {
    const nameTok = toks[i + 1];
    let j = i + 2;
    let typeToks = [];
    if (isOp(toks[j], ':')) {
      const typeEnd = readType(toks, match, j + 1, end);
      typeToks = solid(toks, j + 1, typeEnd);
      j = typeEnd;
    }
    if (isOp(toks[j], '=')) {
      const e = readExpr(toks, match, j + 1, end);
      return { node: { k: 'bind', name: nameTok?.v ?? '', typeToks, expr: [j + 1, e], line, span: [i, e] }, i: e };
    }
    return { node: { k: 'bind', name: nameTok?.v ?? '', typeToks, expr: null, line, span: [i, j] }, i: j };
  }
  if (isId(t, 'if')) return parseIf(src, i, end);
  if (isId(t, 'guard')) {
    const condEnd = readExpr(toks, match, i + 1, end, (u) => isId(u, 'else'));
    const open = nextSolid(toks, condEnd + 1, end);
    if (!isId(toks[condEnd], 'else') || !isOp(toks[open], '{') || match[open] < 0) {
      return { node: { k: 'other', why: 'a guard this reader cannot parse', line, span: [i, condEnd] }, i: Math.max(condEnd, i + 1) };
    }
    const body = parseBlock(src, open + 1, match[open]).stmts;
    return { node: { k: 'guard', cond: [i + 1, condEnd], body, line, span: [i, match[open] + 1] }, i: match[open] + 1 };
  }
  if (isId(t, 'switch')) {
    const subjEnd = readExpr(toks, match, i + 1, end, (u) => isOp(u, '{'));
    if (!isOp(toks[subjEnd], '{') || match[subjEnd] < 0) {
      return { node: { k: 'other', why: 'a switch this reader cannot parse', line, span: [i, subjEnd] }, i: Math.max(subjEnd, i + 1) };
    }
    const close = match[subjEnd];
    const cases = [];
    let j = subjEnd + 1;
    for (;;) {
      while (j < close && (toks[j].t === 'nl' || isOp(toks[j], ';'))) j += 1;
      if (j >= close) break;
      const clauseLine = src.lineOf(toks[j].at);
      let labels = null;
      if (isOp(toks[j], '@') && isId(toks[j + 1], 'unknown')) j += 2;
      if (isId(toks[j], 'default')) {
        j += 1;
      } else if (isId(toks[j], 'case')) {
        const colon = readExpr(toks, match, j + 1, close, (u) => isOp(u, ':'));
        labels = splitCommas(solid(toks, j + 1, colon));
        j = colon;
      } else {
        cases.push({ labels: null, body: [], line: clauseLine, bad: true });
        j += 1;
        continue;
      }
      if (!isOp(toks[j], ':')) {
        cases.push({ labels, body: [], line: clauseLine, bad: true });
        continue;
      }
      const block = parseBlock(src, j + 1, close, true);
      cases.push({ labels, isDefault: labels === null, body: block.stmts, line: clauseLine });
      j = block.i;
    }
    return { node: { k: 'switch', subject: [i + 1, subjEnd], cases, line, span: [i, close + 1] }, i: close + 1 };
  }
  if (isId(t, 'throw') || isId(t, 'return')) {
    const e = readExpr(toks, match, i + 1, end);
    return { node: { k: t.v, expr: [i + 1, e], line, span: [i, e] }, i: e };
  }
  if ((t.t === 'id' && LOOP_WORDS.has(t.v)) || isOp(t, '#')) {
    const e = readExpr(toks, match, i + 1, end);
    return { node: { k: 'other', why: `\`${t.v}\` is not an idiom this reader knows`, line, span: [i, e] }, i: Math.max(e, i + 1) };
  }
  const e = readExpr(toks, match, i, end);
  return { node: { k: 'expr', expr: [i, e], line, span: [i, e] }, i: Math.max(e, i + 1) };
}

function parseIf(src, i, end) {
  const { toks, match } = src;
  const line = src.lineOf(toks[i].at);
  const branches = [];
  let elseBody = null;
  let j = i;
  for (;;) {
    const condEnd = readExpr(toks, match, j + 1, end, (u) => isOp(u, '{'));
    if (!isOp(toks[condEnd], '{') || match[condEnd] < 0) {
      return { node: { k: 'other', why: 'an if this reader cannot parse', line, span: [i, condEnd] }, i: Math.max(condEnd, i + 1) };
    }
    const close = match[condEnd];
    branches.push({ cond: [j + 1, condEnd], body: parseBlock(src, condEnd + 1, close).stmts });
    j = close + 1;
    const after = nextSolid(toks, j, end);
    if (!isId(toks[after], 'else')) break;
    const next = nextSolid(toks, after + 1, end);
    if (isId(toks[next], 'if')) {
      j = next;
      continue;
    }
    if (isOp(toks[next], '{') && match[next] > 0) {
      elseBody = parseBlock(src, next + 1, match[next]).stmts;
      j = match[next] + 1;
    }
    break;
  }
  return { node: { k: 'if', branches, elseBody, line, span: [i, j] }, i: j };
}

// ---------------------------------------------------------------------------
// Declarations and their members
// ---------------------------------------------------------------------------

const DECL_WORDS = new Set(['struct', 'enum', 'class', 'extension', 'actor', 'protocol']);
const MODIFIERS = new Set([
  'private', 'fileprivate', 'internal', 'public', 'open', 'static', 'final', 'override', 'required',
  'convenience', 'mutating', 'nonmutating', 'lazy', 'weak', 'unowned', 'nonisolated', 'dynamic', 'indirect'
]);
const AFTER_CLASS_MODIFIER = new Set(['func', 'var', 'let', 'subscript', 'init', 'override', 'final', 'private', 'fileprivate', 'public', 'internal', 'open', 'static']);

/** Every type declaration and extension in a file, with its body's token range. */
function scanDecls(src) {
  const { toks, match } = src;
  const out = [];
  const stack = [];
  for (let i = 0; i < toks.length; i += 1) {
    while (stack.length > 0 && i > stack[stack.length - 1].close) stack.pop();
    const t = toks[i];
    if (t.t !== 'id' || !DECL_WORDS.has(t.v)) continue;
    let prev = i - 1;
    while (prev >= 0 && toks[prev].t === 'nl') prev -= 1;
    if (prev >= 0 && isOp(toks[prev], '.')) continue;
    const j0 = nextSolid(toks, i + 1, toks.length);
    if (!isId(toks[j0])) continue;
    if (t.v === 'class' && AFTER_CLASS_MODIFIER.has(toks[j0].v)) continue;
    let name = toks[j0].v;
    let j = j0 + 1;
    while (isOp(toks[j], '.') && isId(toks[j + 1])) {
      name += `.${toks[j + 1].v}`;
      j += 2;
    }
    const inherits = new Set();
    let afterColon = false;
    let k = j;
    while (k < toks.length && !isOp(toks[k], '{')) {
      const u = toks[k];
      if (isOp(u, '}')) break;
      if ((isOp(u, '(') || isOp(u, '[')) && match[k] > k) {
        k = match[k] + 1;
        continue;
      }
      if (isOp(u, ':') && !afterColon) afterColon = true;
      else if (isId(u, 'where')) afterColon = false;
      else if (afterColon && u.t === 'id') inherits.add(u.v);
      k += 1;
    }
    if (!isOp(toks[k], '{') || match[k] < 0) continue;
    const parent = stack.length > 0 ? stack[stack.length - 1].qual : null;
    const qual = t.v === 'extension' || parent === null ? name : `${parent}.${name}`;
    const decl = { kind: t.v, name, qual, inherits, open: k, close: match[k], src, line: src.lineOf(t.at) };
    out.push(decl);
    stack.push(decl);
  }
  return out;
}

/** The first `{` at depth 0 from `k`, before the scope's end, or -1. */
function bodyAfter(toks, match, k, end) {
  while (k < end) {
    const t = toks[k];
    if (isOp(t, '{')) return k;
    if (isOp(t, '}')) return -1;
    if ((isOp(t, '(') || isOp(t, '[')) && match[k] > k) {
      k = match[k] + 1;
      continue;
    }
    k += 1;
  }
  return -1;
}

/** The members a scope declares at its own top level. */
function scanMembers(decl) {
  const { src } = decl;
  const { toks, match } = src;
  const m = { inits: [], cases: [], statics: new Map(), funcs: new Map(), stored: [], computed: new Map() };
  if (decl.kind === 'protocol') return m;
  const end = decl.close;
  let k = decl.open + 1;
  while (k < end) {
    if (toks[k].t === 'nl' || isOp(toks[k], ';')) {
      k += 1;
      continue;
    }
    let isStatic = false;
    for (;;) {
      const u = toks[k];
      if (isOp(u, '@')) {
        k += 2;
        if (isOp(toks[k], '(') && match[k] > k) k = match[k] + 1;
        k = nextSolid(toks, k, end);
        continue;
      }
      if (isId(u) && u.v === 'class' && AFTER_CLASS_MODIFIER.has(toks[k + 1]?.v)) {
        isStatic = true;
        k += 1;
        continue;
      }
      if (isId(u) && MODIFIERS.has(u.v)) {
        if (u.v === 'static') isStatic = true;
        k += 1;
        if (isOp(toks[k], '(') && match[k] > k) k = match[k] + 1;
        continue;
      }
      break;
    }
    const u = toks[k];
    if (u === undefined || k >= end) break;
    const line = src.lineOf(u.at);
    if (isId(u, 'init')) {
      const decoderInit =
        isOp(toks[k + 1], '(') && isId(toks[k + 2], 'from') && isId(toks[k + 3]) && isOp(toks[k + 4], ':') &&
        isId(toks[k + 5], 'Decoder') && isOp(toks[k + 6], ')');
      const body = bodyAfter(toks, match, k + 1, end);
      if (body < 0) break;
      if (decoderInit) m.inits.push({ param: toks[k + 3].v, open: body, close: match[body], line, src });
      k = match[body] + 1;
      continue;
    }
    if (isId(u, 'func')) {
      const name = toks[k + 1]?.v ?? '';
      const body = bodyAfter(toks, match, k + 2, end);
      if (body < 0) break;
      m.funcs.set(name, { open: body, close: match[body], isStatic, line, src });
      k = match[body] + 1;
      continue;
    }
    if (isId(u, 'case')) {
      let j = k + 1;
      for (;;) {
        j = nextSolid(toks, j, end);
        if (!isId(toks[j])) break;
        const item = { name: toks[j].v, raw: null, associated: false, line: src.lineOf(toks[j].at) };
        j += 1;
        if (isOp(toks[j], '(') && match[j] > j) {
          item.associated = true;
          j = match[j] + 1;
        }
        if (isOp(toks[j], '=')) {
          const v = toks[j + 1];
          item.raw = v?.t === 'str' ? v.v : (v?.v ?? null);
          j += 2;
        }
        m.cases.push(item);
        if (isOp(toks[j], ',')) {
          j += 1;
          continue;
        }
        break;
      }
      k = j;
      continue;
    }
    if (isId(u, 'let') || isId(u, 'var')) {
      const name = toks[k + 1]?.v ?? '';
      let j = k + 2;
      let typeToks = [];
      if (isOp(toks[j], ':')) {
        const typeEnd = readType(toks, match, j + 1, end);
        typeToks = solid(toks, j + 1, typeEnd);
        j = typeEnd;
      }
      let expr = null;
      let computed = null;
      if (isOp(toks[j], '=')) {
        const e = readExpr(toks, match, j + 1, end);
        expr = [j + 1, e];
        j = e;
      } else if (isOp(toks[j], '{') && match[j] > j) {
        computed = { open: j, close: match[j], src };
        j = match[j] + 1;
      }
      if (isStatic) m.statics.set(name, { typeToks, expr, line, src });
      else if (computed !== null) m.computed.set(name, computed);
      else m.stored.push({ name, typeToks, hasInit: expr !== null, isLet: u.v === 'let', line });
      k = Math.max(j, k + 2);
      continue;
    }
    if (isId(u) && (DECL_WORDS.has(u.v) || u.v === 'subscript')) {
      const body = bodyAfter(toks, match, k + 1, end);
      if (body < 0) break;
      k = match[body] + 1;
      continue;
    }
    k = Math.max(readExpr(toks, match, k, end), k + 1);
  }
  return m;
}

// ---------------------------------------------------------------------------
// The module: every type, its declaration and its extensions together
// ---------------------------------------------------------------------------

/**
 * Read a set of Swift files as one module. `files` is `[{ path, text }]`,
 * `path` relative to the repository root with `/`.
 */
export function readSwiftModule(files) {
  const registry = new Map();
  for (const file of files) {
    const src = sourceOf(file.path, file.text);
    for (const decl of scanDecls(src)) {
      let entry = registry.get(decl.qual);
      if (entry === undefined) {
        entry = { qual: decl.qual, kind: null, inherits: new Set(), parts: [] };
        registry.set(decl.qual, entry);
      }
      if (decl.kind !== 'extension') entry.kind = decl.kind;
      for (const name of decl.inherits) entry.inherits.add(name);
      entry.parts.push({ decl, members: scanMembers(decl) });
    }
  }
  const used = new Set();
  const entry = (qual) => {
    const e = registry.get(qual);
    if (e !== undefined) for (const part of e.parts) used.add(part.decl.src.path);
    return e;
  };
  /** A type name as written inside `scope`, resolved outward, then global. */
  const resolve = (name, scope) => {
    let s = scope;
    while (s !== null && s !== undefined && s !== '') {
      const q = `${s}.${name}`;
      if (registry.has(q)) return q;
      const at = s.lastIndexOf('.');
      s = at === -1 ? null : s.slice(0, at);
    }
    return registry.has(name) ? name : null;
  };
  return { registry, entry, resolve, used };
}

const decodable = (e) => e !== undefined && (e.inherits.has('Codable') || e.inherits.has('Decodable'));
const rawEnum = (e) => e !== undefined && e.kind === 'enum' && e.inherits.has('String');

/** A raw String enum's words, raw value else name, in declared order. */
export function rawWords(mod, qual) {
  const e = mod.entry(qual);
  if (!rawEnum(e)) return null;
  const words = [];
  for (const part of e.parts) for (const c of part.members.cases) if (!c.associated) words.push(c.raw ?? c.name);
  return words;
}

/** The static member `name` of `qual` across its parts. */
function staticOf(mod, qual, name) {
  const e = mod.entry(qual);
  if (e === undefined) return null;
  for (const part of e.parts) {
    const s = part.members.statics.get(name);
    if (s !== undefined) return s;
  }
  return null;
}

function funcOf(mod, qual, name) {
  const e = mod.entry(qual);
  if (e === undefined) return null;
  for (const part of e.parts) {
    const f = part.members.funcs.get(name);
    if (f !== undefined) return f;
  }
  return null;
}

/** Fold a constant's tokens: literals, `* + -`, parentheses, an array or Set literal. */
function foldTokens(ts) {
  const list = ts.filter((t) => t.t !== 'nl');
  if (list.length > 0 && isOp(list[0], '[') && isOp(list[list.length - 1], ']')) {
    const items = splitCommas(list.slice(1, -1)).filter((x) => x.length > 0).map(foldTokens);
    return items.some((x) => x === null) ? null : items;
  }
  let p = 0;
  const num = (t) => {
    const text = t.v.replace(/_/g, '');
    if (!/^(0x[0-9a-fA-F]+|[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?)$/.test(text)) return null;
    return Number(text);
  };
  const factor = () => {
    const t = list[p];
    if (t === undefined) return null;
    if (isOp(t, '(')) {
      p += 1;
      const v = sum();
      if (!isOp(list[p], ')')) return null;
      p += 1;
      return v;
    }
    if (isOp(t, '-')) {
      p += 1;
      const v = factor();
      return v === null ? null : -v;
    }
    if (t.t === 'num') {
      p += 1;
      return num(t);
    }
    return null;
  };
  const product = () => {
    let v = factor();
    while (v !== null && isOp(list[p], '*')) {
      p += 1;
      const r = factor();
      v = r === null ? null : v * r;
    }
    return v;
  };
  const sum = () => {
    let v = product();
    while (v !== null && (isOp(list[p], '+') || isOp(list[p], '-'))) {
      const minus = list[p].v === '-';
      p += 1;
      const r = product();
      v = r === null ? null : minus ? v - r : v + r;
    }
    return v;
  };
  const v = sum();
  return v !== null && p === list.length ? v : null;
}

/** The value of `Type.name` (§5.2 rule 9), or `{ error }`. */
export function readConstant(mod, qualName) {
  const at = qualName.lastIndexOf('.');
  const s = at < 0 ? null : staticOf(mod, qualName.slice(0, at), qualName.slice(at + 1));
  if (s === null || s.expr === null) return { error: `no static constant ${qualName}` };
  const value = foldTokens(s.src.toks.slice(s.expr[0], s.expr[1]));
  if (value === null) return { error: `${qualName} is not a literal, a product of literals or a Set/array literal (${s.src.path}:${String(s.line)})` };
  return { value: Array.isArray(value) ? [...value].sort((a, b) => a - b) : value };
}

// ---------------------------------------------------------------------------
// Kinds
// ---------------------------------------------------------------------------

const BUILTIN = new Map([
  ['String', 'string'], ['Bool', 'bool'],
  ['Double', 'double'], ['Float', 'double'], ['CGFloat', 'double'], ['TimeInterval', 'double'],
  ['Int', 'int'], ['Int8', 'int'], ['Int16', 'int'], ['Int32', 'int'], ['Int64', 'int'],
  ['UInt', 'int'], ['UInt8', 'int'], ['UInt16', 'int'], ['UInt32', 'int'], ['UInt64', 'int']
]);

/** A type written as tokens: `[T]`, `[[T]]`, `A.B`, `T?`, `Optional<T>`. */
function typeSpecOf(ts) {
  let list = ts.filter((t) => t.t !== 'nl');
  let optional = false;
  if (list.length > 1 && isOp(list[list.length - 1], '?')) {
    optional = true;
    list = list.slice(0, -1);
  }
  if (list.length > 3 && isId(list[0], 'Optional') && isOp(list[1], '<') && isOp(list[list.length - 1], '>')) {
    optional = true;
    list = list.slice(2, -1);
  }
  if (list.length >= 2 && isOp(list[0], '[') && isOp(list[list.length - 1], ']')) {
    const inner = list.slice(1, -1);
    if (inner.some((t) => isOp(t, ':'))) return null;
    const spec = typeSpecOf(inner);
    return spec === null ? null : { array: spec, optional };
  }
  const name = dotted(list);
  return name === null ? null : { name, optional };
}

/** A Swift type, as the frozen vocabulary's kind. */
function kindOf(mod, spec, scope) {
  if (spec.array !== undefined) {
    const inner = kindOf(mod, spec.array, scope);
    return inner.error !== undefined ? inner : { kind: { array: inner.kind }, refs: inner.refs };
  }
  const builtin = BUILTIN.get(spec.name);
  if (builtin !== undefined) return { kind: builtin, refs: [] };
  const q = mod.resolve(spec.name, scope);
  if (q === null) return { error: `no type named ${spec.name}` };
  const e = mod.entry(q);
  if (rawEnum(e) && decodable(e)) return { kind: { words: q }, refs: [q] };
  if (decodable(e)) return { kind: { type: q }, refs: [q] };
  return { error: `${q} is not Decodable` };
}

const KIND_RANK = { color: ['string'], count: ['int', 'double'], int: ['double'] };

/** Whether kind `a` accepts every value kind `b` accepts (a ⊇ b), structurally. */
export function kindCovers(a, b) {
  if (typeof a === 'string' && typeof b === 'string') return a === b || (KIND_RANK[b] ?? []).includes(a);
  if (typeof a === 'string' && typeof b === 'object' && b !== null && 'words' in b) return a === 'string';
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    if ('array' in a && 'array' in b) return kindCovers(a.array, b.array);
    if ('type' in a && 'type' in b) return a.type === b.type;
    if ('words' in a && 'words' in b) return a.words === b.words;
  }
  return false;
}

/** Two reads of one key, merged (§5.2 rule 5), or `{ error }`. */
function mergeField(a, b) {
  if (a.presence === 'absent' || b.presence === 'absent') {
    return a.presence === b.presence ? a : { error: 'read and refused in the same case' };
  }
  const presence = a.presence === 'required' || b.presence === 'required' ? 'required' : 'optional';
  const nullOk = a.null || b.null;
  let kind;
  if (kindCovers(a.kind, b.kind)) kind = b.kind;
  else if (kindCovers(b.kind, a.kind)) kind = a.kind;
  else return { error: `read as ${JSON.stringify(a.kind)} and as ${JSON.stringify(b.kind)}` };
  return { presence, null: nullOk, kind };
}

// ---------------------------------------------------------------------------
// One decoder, read
// ---------------------------------------------------------------------------

const READS = {
  decode: { presence: 'required', null: false, typed: true },
  nullable: { presence: 'required', null: true, typed: true },
  decodeIfPresent: { presence: 'optional', null: true, typed: true },
  doorNumber: { presence: 'required', null: false, kind: 'count' },
  nullableDoorNumber: { presence: 'required', null: true, kind: 'count' },
  screenColor: { presence: 'required', null: false, kind: 'color' }
};

/**
 * A ternary or a short-circuit inside an expression. A read beside one is
 * conditional on something this reader does not follow, so it is unread
 * rather than taken as an unconditional read. (`??`, `try?` and optional
 * chaining `?.` are not conditions of this kind.)
 */
const conditional = (ts) => ts.some((t, i) => (isOp(t, '?') && !isOp(ts[i + 1], '.')) || isOp(t, '&&') || isOp(t, '||'));

/** Read one `init(from:)` body into its fields, cases, flattens and relations. */
function readDecoder(mod, qual, init, unread) {
  const { src } = init;
  const { toks, match } = src;
  const scope = qual;
  const keys = codingKeysOf(mod, qual);
  const containers = new Set();
  const bound = new Map();
  const reads = [];
  const absent = [];
  const flattens = [];
  const refs = new Set();
  let relations = false;
  let disc = null;
  const caseWords = [];
  const miss = (line, why) => unread.push({ file: src.path, line, why, type: qual });
  const text = (range) => solid(toks, range[0], range[1]).map((t) => (t.t === 'str' ? JSON.stringify(t.v) : t.v)).join(' ');

  if (keys === null) {
    miss(init.line, `${qual} has no CodingKeys this reader can read`);
    return null;
  }

  /** The wire key of `.name`, or null with the miss recorded. */
  const wireKey = (name, line) => {
    const k = keys.get(name);
    if (k === undefined) miss(line, `.${name} is not a case of ${qual}.CodingKeys`);
    return k ?? null;
  };

  /** The container calls in [a, b), each `{ method, key, spec, at }`; misuse recorded. */
  const callsIn = (a, b, line, allowContains = false) => {
    const out = [];
    for (let j = a; j < b; j += 1) {
      const t = toks[j];
      if (t.t !== 'id') continue;
      let p = j - 1;
      while (p >= a && toks[p].t === 'nl') p -= 1;
      if (p >= 0 && isOp(toks[p], '.')) continue;
      if (containers.has(t.v)) {
        if (!(isOp(toks[j + 1], '.') && isId(toks[j + 2]) && isOp(toks[j + 3], '(') && match[j + 3] > j)) {
          miss(line, `the container \`${t.v}\` is used another way`);
          continue;
        }
        const method = toks[j + 2].v;
        const args = splitCommas(solid(toks, j + 4, match[j + 3]));
        j = match[j + 3];
        if (method === 'contains') {
          const key = args.length === 1 && args[0].length === 2 && isOp(args[0][0], '.') && isId(args[0][1]) ? args[0][1].v : null;
          if (!allowContains || key === null) miss(line, `\`${t.v}.contains\` where this reader does not know what it decides`);
          else out.push({ method, key: wireKey(key, line) });
          continue;
        }
        const read = Object.hasOwn(READS, method) ? READS[method] : undefined;
        if (read === undefined) {
          miss(line, `\`${t.v}.${method}\` is not a read this reader knows`);
          continue;
        }
        const before = toks[p];
        if (!isId(before, 'try')) {
          miss(line, isId(before) && (before.v === 'try?' || before.v === 'try!') ? `\`${before.v}\` takes a refusal away from a read` : `\`${t.v}.${method}\` without a plain try`);
          continue;
        }
        const keyArg = args[args.length - 1];
        const keyName = keyArg !== undefined && keyArg.length === 4 && isId(keyArg[0], 'forKey') && isOp(keyArg[1], ':') && isOp(keyArg[2], '.') && isId(keyArg[3]) ? keyArg[3].v : null;
        let spec = null;
        if (read.typed) {
          const typeArg = args.length === 2 ? args[0] : null;
          if (typeArg !== null && typeArg.length >= 3 && isOp(typeArg[typeArg.length - 2], '.') && isId(typeArg[typeArg.length - 1], 'self')) {
            spec = typeSpecOf(typeArg.slice(0, -2));
          }
          if (spec === null || spec.optional) {
            miss(line, `\`${t.v}.${method}\` over a type this reader cannot read`);
            continue;
          }
        } else if (args.length !== 1) {
          miss(line, `\`${t.v}.${method}\` with arguments this reader does not know`);
          continue;
        }
        if (keyName === null) {
          miss(line, `\`${t.v}.${method}\` without a \`forKey: .name\``);
          continue;
        }
        const key = wireKey(keyName, line);
        if (key === null) continue;
        let kind = read.kind;
        if (read.typed) {
          const k = kindOf(mod, spec, scope);
          if (k.error !== undefined) {
            miss(line, k.error);
            continue;
          }
          kind = k.kind;
          for (const r of k.refs) refs.add(r);
        }
        out.push({ method, key, presence: read.presence, null: read.null, kind, spec });
        continue;
      }
      if (t.v === init.param) {
        // `try X(from: decoder)`: a flatten.
        const flat = isOp(toks[j - 1], ':') && isId(toks[j - 2], 'from') && isOp(toks[j - 3], '(') && isOp(toks[j + 1], ')');
        if (flat) {
          let s = j - 4;
          const nameToks = [];
          while (s >= a && (isId(toks[s]) || isOp(toks[s], '.')) && !isId(toks[s], 'try')) {
            nameToks.unshift(toks[s]);
            s -= 1;
          }
          const name = dotted(nameToks);
          const q = name === null ? null : mod.resolve(name, scope);
          if (isId(toks[s], 'try') && q !== null && decodable(mod.entry(q))) {
            out.push({ method: 'flatten', type: q });
            refs.add(q);
            continue;
          }
        }
        miss(line, `the decoder \`${t.v}\` is used another way`);
      }
    }
    return out;
  };

  const record = (calls, ctx, line) => {
    for (const c of calls) {
      if (c.method === 'flatten') {
        if (ctx.cases !== null || ctx.only !== null || ctx.noReads) miss(line, 'a flatten under a condition');
        else if (!flattens.includes(c.type)) flattens.push(c.type);
        continue;
      }
      if (c.method === 'contains') continue;
      if (ctx.noReads) {
        miss(line, `a read of .${c.key} under a condition this reader does not know`);
        continue;
      }
      if (ctx.only !== null && c.key !== ctx.only) {
        miss(line, `a read of .${c.key} inside a branch about .${ctx.only}`);
        continue;
      }
      const presence = ctx.optionalKey === c.key ? 'optional' : c.presence;
      reads.push({ key: c.key, presence, null: c.null, kind: c.kind, cases: ctx.cases, line });
    }
  };

  /** Does a statement list throw (a guard's else, a closed default)? */
  const containsThrow = (stmts) => stmts.some((s) => s.k === 'throw');

  const walk = (stmts, ctx) => {
    for (const s of stmts) {
      switch (s.k) {
        case 'bind': {
          if (s.expr === null) break;
          const e = solid(toks, s.expr[0], s.expr[1]);
          const isContainer =
            e.length === 11 && isId(e[0], 'try') && isId(e[1], init.param) && isOp(e[2], '.') && isId(e[3], 'container') &&
            isOp(e[4], '(') && isId(e[5], 'keyedBy') && isOp(e[6], ':') && isId(e[7], 'CodingKeys') && isOp(e[8], '.') &&
            isId(e[9], 'self') && isOp(e[10], ')');
          if (isContainer) {
            containers.add(s.name);
            break;
          }
          const calls = callsIn(s.expr[0], s.expr[1], s.line);
          if (calls.length > 0 && conditional(e)) {
            miss(s.line, `a read under a condition inside an expression: ${text(s.expr)}`);
            break;
          }
          const one = calls.length === 1 && calls[0].method === 'decode' && calls[0].kind === 'string' && e.length === 14 ? calls[0] : null;
          if (one !== null) bound.set(s.name, { key: one.key, read: { key: one.key, presence: 'required', null: false, kind: 'string', cases: ctx.cases, line: s.line } });
          record(calls, ctx, s.line);
          break;
        }
        case 'expr': {
          const calls = callsIn(s.expr[0], s.expr[1], s.line);
          const e = solid(toks, s.expr[0], s.expr[1]);
          if (calls.length > 0 && e.some((t) => isOp(t, '{'))) miss(s.line, `a read inside a closure: ${text(s.expr)}`);
          else if (calls.length > 0 && conditional(e)) miss(s.line, `a read under a condition inside an expression: ${text(s.expr)}`);
          else record(calls, ctx, s.line);
          break;
        }
        case 'if': {
          // Each branch is classified by its condition; the else is read the
          // way the LAST condition says: the cases a narrowing left, the one
          // key of a double read, or nothing at all.
          let remaining = ctx.cases;
          let elseCtx = { ...ctx, noReads: true };
          for (const branch of s.branches) {
            const c = solid(toks, branch.cond[0], branch.cond[1]);
            // 1. `if c.contains(.k)`: .k optional in its branch, nothing else read.
            if (c.length === 7 && containers.has(c[0]?.v) && isOp(c[1], '.') && isId(c[2], 'contains') && isOp(c[3], '(') && isOp(c[4], '.') && isId(c[5]) && isOp(c[6], ')')) {
              const key = wireKey(c[5].v, s.line);
              walk(branch.body, { ...ctx, cases: remaining, optionalKey: key, only: key });
              elseCtx = { ...ctx, cases: remaining, noReads: true };
              continue;
            }
            // 2. `if let x = try c.decodeIfPresent(T.self, forKey: .k)`.
            if (c.length > 3 && isId(c[0], 'let') && isId(c[1]) && isOp(c[2], '=')) {
              const calls = callsIn(branch.cond[0], branch.cond[1], s.line);
              if (calls.length === 1 && calls[0].method === 'decodeIfPresent') {
                record(calls, { ...ctx, cases: remaining }, s.line);
                walk(branch.body, { ...ctx, cases: remaining, noReads: true });
              } else {
                miss(s.line, `an if-let this reader does not know: ${text(branch.cond)}`);
              }
              elseCtx = { ...ctx, cases: remaining, noReads: true };
              continue;
            }
            // 3. `if w == "x"` on the bound discriminant, inside a case.
            if (c.length === 3 && disc !== null && disc.var === c[0]?.v && isOp(c[1], '==') && c[2].t === 'str' && remaining !== null) {
              const word = c[2].v;
              if (!remaining.includes(word)) {
                // A narrowing to a word this case does not hold reads into no case at all.
                miss(s.line, `if ${disc.var} == ${JSON.stringify(word)} inside a case that does not hold that word`);
                continue;
              }
              walk(branch.body, { ...ctx, cases: remaining.filter((w) => w === word) });
              remaining = remaining.filter((w) => w !== word);
              elseCtx = { ...ctx, cases: remaining };
              continue;
            }
            // 4. `if try c.nullable(T.self, forKey: .k) == nil` (or `!=`): the double read.
            const calls = callsIn(branch.cond[0], branch.cond[1], s.line);
            if (calls.length === 1 && calls[0].method === 'nullable' && c.length > 2 && (isOp(c[c.length - 2], '==') || isOp(c[c.length - 2], '!=')) && isId(c[c.length - 1], 'nil')) {
              record(calls, { ...ctx, cases: remaining }, s.line);
              walk(branch.body, { ...ctx, cases: remaining, only: calls[0].key });
              elseCtx = { ...ctx, cases: remaining, only: calls[0].key };
              continue;
            }
            if (calls.length > 0 || c.some((t) => isId(t, init.param))) {
              miss(s.line, `an if whose condition reads the door in a way this reader does not know: ${text(branch.cond)}`);
            } else {
              walk(branch.body, { ...ctx, cases: remaining, noReads: true });
            }
            elseCtx = { ...ctx, cases: remaining, noReads: true };
          }
          if (s.elseBody !== null) walk(s.elseBody, elseCtx);
          break;
        }
        case 'guard': {
          const c = solid(toks, s.cond[0], s.cond[1]);
          if (!containsThrow(s.body)) {
            miss(s.line, 'a guard whose else does not throw');
            break;
          }
          if (c.length === 8 && isOp(c[0], '!') && containers.has(c[1]?.v) && isOp(c[2], '.') && isId(c[3], 'contains') && isOp(c[4], '(') && isOp(c[5], '.') && isId(c[6]) && isOp(c[7], ')')) {
            const key = wireKey(c[6].v, s.line);
            if (key !== null) absent.push({ key, cases: ctx.cases });
            break;
          }
          const calls = callsIn(s.cond[0], s.cond[1], s.line);
          if (calls.length > 0 || c.some((t) => containers.has(t.v) || isId(t, init.param))) {
            miss(s.line, `a guard that reads the door in a way this reader does not know: ${text(s.cond)}`);
            break;
          }
          relations = true;
          break;
        }
        case 'switch': {
          const subj = solid(toks, s.subject[0], s.subject[1]);
          let tagKey = null;
          let discVar = null;
          if (subj.length === 1 && bound.has(subj[0].v)) {
            const b = bound.get(subj[0].v);
            tagKey = b.key;
            discVar = subj[0].v;
            const at = reads.indexOf(reads.find((r) => r.key === b.key && r.line === b.read.line));
            if (at >= 0) reads.splice(at, 1);
          } else {
            const calls = callsIn(s.subject[0], s.subject[1], s.line);
            if (calls.length === 1 && calls[0].method === 'decode' && calls[0].kind === 'string' && subj.length === 14) tagKey = calls[0].key;
          }
          if (tagKey === null || disc !== null || ctx.cases !== null) {
            miss(s.line, `a switch this reader does not know: ${text(s.subject)}`);
            break;
          }
          disc = { key: tagKey, var: discVar, closed: null };
          for (const clause of s.cases) {
            if (clause.bad) {
              miss(clause.line, 'a switch clause this reader cannot parse');
              continue;
            }
            if (clause.isDefault) {
              if (containsThrow(clause.body)) disc.closed = true;
              else if (clause.body.every((b) => b.k === 'expr')) {
                disc.closed = false;
                walk(clause.body, { ...ctx, noReads: true });
              } else miss(clause.line, 'a default this reader does not know');
              continue;
            }
            const words = [];
            for (const label of clause.labels) {
              if (label.length === 1 && label[0].t === 'str') {
                words.push(label[0].v);
                continue;
              }
              const name = dotted(label);
              const value = name === null ? null : wordConstant(mod, name, scope);
              if (value === null) miss(clause.line, `a case label this reader cannot read: ${label.map((t) => t.v).join('')}`);
              else words.push(value);
            }
            for (const w of words) if (!caseWords.includes(w)) caseWords.push(w);
            walk(clause.body, { ...ctx, cases: words });
          }
          if (disc.closed === null) miss(s.line, 'a switch with no default');
          break;
        }
        case 'throw':
          if (ctx.cases === null) miss(s.line, 'a throw outside a guard or a case');
          break;
        case 'return':
          miss(s.line, 'a return inside a decoder');
          break;
        default:
          miss(s.line, s.why ?? 'a statement this reader does not know');
      }
    }
  };

  const body = parseBlock(src, init.open + 1, init.close).stmts;
  walk(body, { cases: null, optionalKey: null, only: null, noReads: false });

  // Assemble. The tag is the discriminant, never one of the fields.
  const bucket = (filter) => {
    const fields = {};
    for (const r of reads.filter(filter)) {
      if (disc !== null && r.key === disc.key) continue;
      const f = { presence: r.presence, null: r.null, kind: r.kind };
      if (fields[r.key] === undefined) fields[r.key] = f;
      else {
        const merged = mergeField(fields[r.key], f);
        if (merged.error !== undefined) miss(r.line, `.${r.key}: ${merged.error}`);
        else fields[r.key] = merged;
      }
    }
    return fields;
  };
  const def = {};
  const common = bucket((r) => r.cases === null);
  for (const a of absent.filter((x) => x.cases === null)) {
    if (common[a.key] !== undefined) miss(init.line, `.${a.key} is read and refused`);
    else common[a.key] = { presence: 'absent' };
  }
  if (disc !== null) {
    def.tag = disc.key;
    def.words = disc.closed ? 'closed' : 'open';
    def.cases = {};
    for (const w of caseWords) {
      const fields = bucket((r) => r.cases !== null && r.cases.includes(w));
      for (const a of absent.filter((x) => x.cases !== null && x.cases.includes(w))) {
        if (fields[a.key] !== undefined) miss(init.line, `.${a.key} is read and refused in case ${w}`);
        else fields[a.key] = { presence: 'absent' };
      }
      def.cases[w] = fields;
    }
    if (Object.keys(common).length > 0) def.fields = common;
  } else {
    def.fields = common;
  }
  if (flattens.length > 0) def.flattens = flattens;
  def.relations = relations;
  return { def, refs: [...refs] };
}

/** `Word.x` (or `Self.Word.x`, `T.Word.x`) as the string its static let holds, or null. */
function wordConstant(mod, name, scope) {
  const parts = name.split('.');
  if (parts[0] === 'Self') parts.shift();
  if (parts.length < 2) return null;
  const member = parts.pop();
  const q = mod.resolve(parts.join('.'), scope);
  if (q === null) return null;
  const s = staticOf(mod, q, member);
  if (s === null || s.expr === null) return null;
  const ts = solid(s.src.toks, s.expr[0], s.expr[1]);
  return ts.length === 1 && ts[0].t === 'str' && ts[0].interpolated === 0 ? ts[0].v : null;
}

/** `CodingKeys` of `qual`: Swift case name to wire key, or null. */
function codingKeysOf(mod, qual) {
  const e = mod.entry(`${qual}.CodingKeys`);
  if (e === undefined) return null;
  const map = new Map();
  for (const part of e.parts) for (const c of part.members.cases) map.set(c.name, c.raw ?? c.name);
  return map;
}

/** A synthesized `Decodable`: its stored properties (§5.2 rule 7). */
function readSynthesized(mod, qual, e, unread) {
  const decl = e.parts.find((p) => p.decl.kind !== 'extension');
  if (decl === undefined) {
    unread.push({ file: e.parts[0].decl.src.path, line: e.parts[0].decl.line, why: `${qual} has no declaration with stored properties`, type: qual });
    return null;
  }
  const keys = codingKeysOf(mod, qual);
  const fields = {};
  const refs = [];
  for (const prop of decl.members.stored) {
    if (prop.isLet && prop.hasInit) continue;
    const spec = typeSpecOf(prop.typeToks);
    if (spec === null) {
      unread.push({ file: decl.decl.src.path, line: prop.line, why: `${qual}.${prop.name}: a type this reader cannot read`, type: qual });
      continue;
    }
    const k = kindOf(mod, { ...spec, optional: false }, qual);
    if (k.error !== undefined) {
      unread.push({ file: decl.decl.src.path, line: prop.line, why: `${qual}.${prop.name}: ${k.error}`, type: qual });
      continue;
    }
    refs.push(...k.refs);
    const wire = keys === null ? prop.name : keys.get(prop.name);
    if (wire === undefined) continue;
    fields[wire] = spec.optional ? { presence: 'optional', null: true, kind: k.kind } : { presence: 'required', null: false, kind: k.kind };
  }
  return { def: { fields, relations: false, synthesized: true }, refs };
}

/** Classify every type reachable from `roots` (§5.3). */
export function classify(mod, roots) {
  const types = {};
  const unread = [];
  const queue = [...roots];
  while (queue.length > 0) {
    const qual = queue.shift();
    if (qual === null || types[qual] !== undefined) continue;
    const e = mod.entry(qual);
    if (e === undefined) {
      unread.push({ file: '', line: 0, why: `no type named ${qual}`, type: qual });
      types[qual] = { missing: true };
      continue;
    }
    if (rawEnum(e)) {
      types[qual] = { words: [...rawWords(mod, qual)].sort() };
      continue;
    }
    const init = e.parts.flatMap((p) => p.members.inits)[0];
    let read = null;
    if (init !== undefined) read = readDecoder(mod, qual, init, unread);
    else if (decodable(e)) read = readSynthesized(mod, qual, e, unread);
    else unread.push({ file: e.parts[0].decl.src.path, line: e.parts[0].decl.line, why: `${qual} is not Decodable`, type: qual });
    types[qual] = read === null ? { unreadable: true } : read.def;
    if (read !== null) queue.push(...read.refs);
  }
  return { types, unread };
}

// ---------------------------------------------------------------------------
// The phone, read whole
// ---------------------------------------------------------------------------

function listSwift(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  const walkDir = (d) => {
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walkDir(p);
      else if (name.endsWith('.swift')) out.push(p);
    }
  };
  walkDir(dir);
  return out;
}

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** The path of a static target, or of the first string a `<x>Target(…)` function returns. */
function targetPath(mod, owner, name, problems) {
  const s = staticOf(mod, owner, name);
  if (s !== null && s.expr !== null) {
    const ts = solid(s.src.toks, s.expr[0], s.expr[1]);
    if (ts.length === 1 && ts[0].t === 'str') return ts[0].v;
  }
  const f = funcOf(mod, owner, name);
  if (f !== null) {
    const first = f.src.toks.slice(f.open, f.close).find((t) => t.t === 'str');
    if (first !== undefined) return first.v.split('?')[0].split(HOLE)[0];
  }
  problems.push({ file: '', line: 0, why: `${owner}.${name} names no target this reader can read` });
  return null;
}

/** The first `method: "M"` inside a function body. */
function methodIn(f) {
  if (f === null) return null;
  const ts = solid(f.src.toks, f.open, f.close);
  for (let i = 0; i + 2 < ts.length; i += 1) if (isId(ts[i], 'method') && isOp(ts[i + 1], ':') && ts[i + 2].t === 'str') return ts[i + 2].v;
  return null;
}

/** `JSONDecoder().decode(T.self` or `Self.decode(T.self` inside a body, as T. */
function decodedIn(f, viaSelf) {
  return decodedAllIn(f, viaSelf)[0] ?? null;
}

/** Every type a function decodes with `JSONDecoder().decode(T.self` (or `Self.decode(T.self`), in source order. */
function decodedAllIn(f, viaSelf) {
  if (f === null) return [];
  const out = [];
  const ts = solid(f.src.toks, f.open, f.close);
  for (let i = 0; i < ts.length; i += 1) {
    const lead = viaSelf
      ? isId(ts[i], 'Self') && isOp(ts[i + 1], '.') && isId(ts[i + 2], 'decode') && isOp(ts[i + 3], '(')
      : isId(ts[i], 'JSONDecoder') && isOp(ts[i + 1], '(') && isOp(ts[i + 2], ')') && isOp(ts[i + 3], '.') && isId(ts[i + 4], 'decode') && isOp(ts[i + 5], '(');
    if (!lead) continue;
    const at = viaSelf ? i + 4 : i + 6;
    if (isId(ts[at]) && isOp(ts[at + 1], '.') && isId(ts[at + 2], 'self')) out.push(ts[at].v);
  }
  return out;
}

/**
 * Why a pre-read of the QR payload asks something the QR's answer type does
 * not already ask, or null when it asks nothing more. Since Phase 333.1
 * `PairingOffer.parse` decodes a `Marker` (`v`, `fp`, `dk`, `dx`) from the
 * same payload before its `Wire`, to say which side to update; a code both
 * must accept, so the phone's requirement is the two together. The frozen
 * format names ONE QR type, so a pre-read is admitted only when every code
 * the answer type accepts it accepts too: each of its fields is a field of
 * the answer of the same kind, required there when required here, and null
 * refused there when refused here. Anything else is an unread statement, so
 * a later phone whose pre-read asks more is red (P0) and never frozen short.
 */
function preReadAsksMore(pre, answer) {
  if (pre === undefined || pre.fields === undefined || pre.cases !== undefined || pre.relations === true) return 'it is not a plain object of fields this reader can compare';
  if (answer === undefined || answer.fields === undefined) return 'the answer type has no fields to compare it with';
  for (const [key, f] of Object.entries(pre.fields)) {
    const a = answer.fields[key];
    if (a === undefined || a.presence === 'absent') return `it reads \`${key}\`, which the answer type does not`;
    if (canonical(f.kind) !== canonical(a.kind)) return `it reads \`${key}\` as ${canonical(f.kind)} where the answer type reads ${canonical(a.kind)}`;
    if (f.presence === 'required' && a.presence !== 'required') return `it requires \`${key}\`, which the answer type does not`;
    if (f.null === false && a.null !== false) return `it refuses a null \`${key}\`, which the answer type accepts`;
  }
  return null;
}

/** The routes the phone calls (§5.3), each with the type it decodes the answer with. */
function readRoutes(mod, problems) {
  const routes = [];
  const used = new Set();
  const owner = 'DoorClient';
  const door = mod.entry(owner);
  if (door === undefined) {
    problems.push({ file: '', line: 0, why: 'no DoorClient: the route roots cannot be read' });
    return routes;
  }
  const getMethod = methodIn(funcOf(mod, owner, 'signedGet'));
  for (const part of door.parts) {
    const { src } = part.decl;
    const { toks, match } = src;
    for (let i = part.decl.open; i < part.decl.close; i += 1) {
      if (!isId(toks[i], 'signedGet') || !isOp(toks[i + 1], '(')) continue;
      let p = i - 1;
      while (toks[p]?.t === 'nl') p -= 1;
      if (isId(toks[p], 'func')) continue;
      const args = splitCommas(solid(toks, i + 2, match[i + 1]));
      const first = args[0] ?? [];
      const type = first.length === 3 && isId(first[0]) && isOp(first[1], '.') && isId(first[2], 'self') ? first[0].v : null;
      const targetArg = args.find((a) => isId(a[0], 'target'));
      const target = targetArg !== undefined && isOp(targetArg[1], ':') && isId(targetArg[2], 'Self') && isOp(targetArg[3], '.') && isId(targetArg[4]) ? targetArg[4].v : null;
      if (type === null || target === null) {
        problems.push({ file: src.path, line: src.lineOf(toks[i].at), why: 'a signedGet whose answer type or target this reader cannot read' });
        continue;
      }
      const path = targetPath(mod, owner, target, problems);
      used.add(target);
      const answer = mod.resolve(type, owner);
      if (path !== null) routes.push({ method: getMethod, path, signed: true, answer, via: 'signedGet' });
    }
  }
  // `POST /pair`: `present`'s `Self.decode(T.self` beside `Self.pairTarget`.
  const present = funcOf(mod, owner, 'present');
  if (present !== null) {
    const ts = solid(present.src.toks, present.open, present.close);
    const hasTarget = ts.some((t, i) => isId(t, 'target') && isOp(ts[i + 1], ':') && isId(ts[i + 2], 'Self') && isId(ts[i + 4], 'pairTarget'));
    const type = decodedIn(present, true);
    if (hasTarget && type !== null) {
      used.add('pairTarget');
      routes.push({ method: methodIn(present), path: targetPath(mod, owner, 'pairTarget', problems), signed: false, answer: mod.resolve(type, owner), via: 'present' });
    } else problems.push({ file: present.src.path, line: present.line, why: 'present names no pairTarget or decodes no answer this reader can read' });
  } else problems.push({ file: '', line: 0, why: 'no DoorClient.present: the pairing route cannot be read' });
  // The writes: `WriteRoute.target`'s cases, answered as `WriteResult.of` decodes.
  const target = (() => {
    const e = mod.entry('WriteRoute');
    for (const part of e?.parts ?? []) {
      const c = part.members.computed.get('target');
      if (c !== undefined) return c;
    }
    return null;
  })();
  const writeType = decodedIn(funcOf(mod, 'WriteResult', 'of'), false);
  const postMethod = methodIn(funcOf(mod, owner, 'signedPost'));
  if (target === null || writeType === null) {
    problems.push({ file: '', line: 0, why: 'WriteRoute.target or WriteResult.of cannot be read: the write routes cannot be read' });
  } else {
    const ts = solid(target.src.toks, target.open, target.close);
    for (let i = 0; i < ts.length; i += 1) {
      if (!(isId(ts[i], 'case') && isOp(ts[i + 1], '.') && isId(ts[i + 2]) && isOp(ts[i + 3], ':') && isId(ts[i + 4], owner) && isOp(ts[i + 5], '.') && isId(ts[i + 6]))) continue;
      const path = targetPath(mod, owner, ts[i + 6].v, problems);
      used.add(ts[i + 6].v);
      if (path !== null) routes.push({ method: postMethod, path, signed: true, answer: mod.resolve(writeType, 'WriteResult'), via: 'signedPost' });
    }
  }
  // EVERY TARGET THE PHONE SPELLS IS ACCOUNTED FOR. A `<x>Target` the network
  // file declares that no root above used is a route this reader stopped
  // seeing (a renamed `signedGet`, a new call shape), which would otherwise
  // drop that answer from every P clause in silence.
  for (const part of door.parts) {
    const { src } = part.decl;
    for (const [name, s] of part.members.statics) {
      if (name.endsWith('Target') && !used.has(name)) problems.push({ file: src.path, line: s.line, why: `DoorClient.${name} is a target no route root this reader knows calls` });
    }
    for (const [name, f] of part.members.funcs) {
      if (f.isStatic && name.endsWith('Target') && !used.has(name)) problems.push({ file: src.path, line: f.line, why: `DoorClient.${name}(…) is a target no route root this reader knows calls` });
    }
  }
  for (const r of routes) {
    if (r.answer === null) problems.push({ file: '', line: 0, why: `the route ${r.path} decodes a type this reader cannot find` });
    if (r.method === null) problems.push({ file: '', line: 0, why: `the route ${r.path} has no method this reader can read` });
  }
  return routes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}

/** The statuses every `switch reply.status` in the network file reads (their intersection). */
function readStatuses(mod, problems) {
  const door = mod.entry('DoorClient');
  const src = door?.parts.find((p) => p.decl.kind === 'class')?.decl.src;
  if (src === undefined) return [];
  const { toks, match } = src;
  let all = null;
  for (let i = 0; i < toks.length; i += 1) {
    if (!(isId(toks[i], 'switch') && isId(toks[i + 1], 'reply') && isOp(toks[i + 2], '.') && isId(toks[i + 3], 'status') && isOp(toks[i + 4], '{'))) continue;
    const close = match[i + 4];
    const read = new Set();
    for (let j = i + 5; j < close; j += 1) {
      if (isId(toks[j], 'case') && toks[j + 1]?.t === 'num' && isOp(toks[j + 2], ':')) read.add(Number(toks[j + 1].v));
    }
    all = all === null ? read : new Set([...all].filter((x) => read.has(x)));
  }
  if (all === null || all.size === 0) {
    problems.push({ file: src.path, line: 0, why: 'no `switch reply.status` this reader can read' });
    return [];
  }
  return [...all].sort((a, b) => a - b);
}

/**
 * The phone's wire, read from its Swift (§5.4): the routes it calls and the
 * type each answer is decoded with, the QR's type, every reachable type, the
 * bounds' values, the words it sends, the statuses it reads, every unread
 * statement, and the sha256 of every file the reading used.
 */
export function readPhoneWire(root) {
  const app = join(root, 'ios', 'Tortie');
  const files = listSwift(app).map((p) => ({ path: relative(root, p).split(sep).join('/'), text: readFileSync(p, 'utf8') }));
  const mod = readSwiftModule(files);
  const problems = [];
  const routes = readRoutes(mod, problems);
  // The QR's answer is the LAST type `parse` decodes, the one the offer is
  // built from; any decoded before it is a pre-read of the same payload
  // (Phase 333.1's `Marker`), held to asking nothing more below.
  const qrTypes = decodedAllIn(funcOf(mod, 'PairingOffer', 'parse'), false).map((t) => mod.resolve(t, 'PairingOffer'));
  const qr = { answer: qrTypes.length === 0 ? null : qrTypes[qrTypes.length - 1] };
  if (qr.answer === null) problems.push({ file: '', line: 0, why: 'PairingOffer.parse decodes no type this reader can find: the QR cannot be read' });
  const roots = [...new Set([...routes.map((r) => r.answer), qr.answer].filter((x) => x !== null))].sort();
  const { types, unread } = classify(mod, roots);
  for (const pre of new Set(qrTypes.slice(0, -1))) {
    if (pre === null || pre === qr.answer) continue;
    const r = classify(mod, [pre]);
    unread.push(...r.unread);
    const why = preReadAsksMore(r.types[pre], types[qr.answer]);
    if (why !== null) problems.push({ file: '', line: 0, why: `PairingOffer.parse reads the QR as ${pre} before ${qr.answer}, and ${why}` });
  }
  unread.push(...problems);
  const bounds = BOUND_ROWS.map((row) => {
    const c = readConstant(mod, row.phone);
    if (c.error !== undefined) unread.push({ file: '', line: 0, why: c.error });
    return { ...row, value: c.value ?? null };
  });
  const formats = FORMAT_ROWS.map((row) => ({ ...row }));
  for (const row of formats) {
    const t = types[row.type];
    const fields = t === undefined ? undefined : row.case !== undefined ? t.cases?.[row.case] : t.fields;
    if (fields?.[row.key] === undefined) unread.push({ file: '', line: 0, why: `format ${row.format}: ${row.type}.${row.key} is not a field the phone reads` });
    // Asked of the registry directly: a predicate's NAME is checked, and the
    // file it lives in contributes nothing to the projection.
    const at = row.swift.lastIndexOf('.');
    const owner = mod.registry.get(row.swift.slice(0, at));
    const member = row.swift.slice(at + 1);
    const named = owner !== undefined && owner.parts.some((p) => p.members.funcs.has(member) || p.members.statics.has(member));
    if (!named) unread.push({ file: '', line: 0, why: `format ${row.format}: the phone has no ${row.swift}` });
  }
  const sends = SEND_ROWS.map((row) => {
    const words = rawWords(mod, row.phone);
    if (words === null) unread.push({ file: '', line: 0, why: `send ${row.phone}: not a String enum this reader can read` });
    return { ...row, words: words === null ? null : [...words].sort() };
  });
  const statuses = readStatuses(mod, unread);
  const version = bounds.find((b) => b.phone === 'PairingOffer.version')?.value ?? null;
  const ports = bounds.find((b) => b.phone === 'DoorEndpoint.publicPorts')?.value ?? null;
  for (const f of ['ios/Tortie/Door/DoorClient.swift', 'ios/Tortie/Door/Pairing.swift']) if (files.some((x) => x.path === f)) mod.used.add(f);
  const read = {};
  for (const path of [...mod.used].sort()) {
    const file = files.find((f) => f.path === path);
    if (file !== undefined) read[path] = sha256(file.text);
  }
  return { routes, qr, types, formats, bounds, sends, statuses, version, ports, unread, read, files: files.length };
}

// ---------------------------------------------------------------------------
// The projection (§5.4) and canonical JSON
// ---------------------------------------------------------------------------

/** JSON with every object's keys sorted and no spaces: the one canonical text. */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * The part of a wire that is the phone's own bytes: its routes (method, path,
 * signedness, answer type), the QR's type, every reachable type, the bounds'
 * phone values (the QR version and the ports among them), the words it sends
 * and the statuses it reads. The same function over a reading of today and
 * over a frozen file, so P4 and the proof compare like with like.
 */
export function projectionOf(wire) {
  const byKey = (k) => (a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0);
  return {
    routes: (wire.routes ?? []).map((r) => ({ method: r.method, path: r.path, signed: r.signed, answer: r.answer })).sort(byKey('path')),
    qr: { answer: wire.qr?.answer ?? null },
    types: wire.types ?? {},
    bounds: (wire.bounds ?? []).map((b) => ({ phone: b.phone, value: b.value })).sort(byKey('phone')),
    sends: (wire.sends ?? []).map((s) => ({ phone: s.phone, words: s.words === null ? null : [...s.words].sort() })).sort(byKey('phone')),
    statuses: [...(wire.statuses ?? [])].sort((a, b) => a - b)
  };
}

/** The projection as canonical JSON (§5.4). */
export function projection(wire) {
  return canonical(projectionOf(wire));
}

/** Every leaf of a value as `path = value` lines, sorted: what `--replace` prints. */
export function leafLines(value, path = '') {
  if (Array.isArray(value)) {
    if (value.length === 0) return [`${path} = []`];
    if (value.every((v) => v === null || typeof v !== 'object')) return [`${path} = ${JSON.stringify(value)}`];
    return value.flatMap((v, i) => leafLines(v, `${path}/${String(i)}`));
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    if (keys.length === 0) return [`${path} = {}`];
    return keys.flatMap((k) => leafLines(value[k], `${path}/${k}`));
  }
  return [`${path} = ${JSON.stringify(value)}`];
}

/** The paths at which two projections differ, at most `limit`. */
export function differingPaths(a, b, limit = 10) {
  const left = new Set(leafLines(projectionOf(a)));
  const right = new Set(leafLines(projectionOf(b)));
  const paths = new Set();
  for (const l of left) if (!right.has(l)) paths.add(l.split(' = ')[0]);
  for (const r of right) if (!left.has(r)) paths.add(r.split(' = ')[0]);
  const all = [...paths].sort();
  return { count: all.length, paths: all.slice(0, limit) };
}

// ---------------------------------------------------------------------------
// The reader's own proof (§5.6)
// ---------------------------------------------------------------------------

/**
 * Read every `*.swift.txt` under `dir` and compare with its `*.expect.json`:
 * `{ roots, types, unread: [line, …], constants: { "T.n": value }, words: { E: [...] } }`.
 * Answers `{ files, problems }`; a fixture that reads otherwise is a problem.
 */
export function proveReader(dir) {
  const problems = [];
  if (!existsSync(dir)) return { files: 0, problems: [`${dir} does not exist`] };
  const names = readdirSync(dir).filter((n) => n.endsWith('.swift.txt')).sort();
  for (const name of names) {
    const expectPath = join(dir, name.replace(/\.swift\.txt$/, '.expect.json'));
    if (!existsSync(expectPath)) {
      problems.push(`${name}: no ${name.replace(/\.swift\.txt$/, '.expect.json')} beside it`);
      continue;
    }
    const expect = JSON.parse(readFileSync(expectPath, 'utf8'));
    const mod = readSwiftModule([{ path: name, text: readFileSync(join(dir, name), 'utf8') }]);
    const got = classify(mod, expect.roots ?? []);
    if (expect.types !== undefined && canonical(got.types) !== canonical(expect.types)) {
      problems.push(`${name}: types read as ${canonical(got.types)}, expected ${canonical(expect.types)}`);
    }
    const gotLines = got.unread.map((u) => u.line).sort((a, b) => a - b);
    const wantLines = [...(expect.unread ?? [])].sort((a, b) => a - b);
    if (canonical(gotLines) !== canonical(wantLines)) {
      problems.push(`${name}: unread at lines ${canonical(gotLines)} (${got.unread.map((u) => u.why).join('; ')}), expected ${canonical(wantLines)}`);
    }
    for (const [qualName, want] of Object.entries(expect.constants ?? {})) {
      const c = readConstant(mod, qualName);
      if (canonical(c.value ?? c.error) !== canonical(want)) problems.push(`${name}: ${qualName} read as ${canonical(c.value ?? c.error)}, expected ${canonical(want)}`);
    }
    for (const [qual, want] of Object.entries(expect.words ?? {})) {
      const words = rawWords(mod, qual);
      if (canonical(words) !== canonical(want)) problems.push(`${name}: ${qual}'s words read as ${canonical(words)}, expected ${canonical(want)}`);
    }
  }
  if (names.length === 0) problems.push(`${dir} holds no *.swift.txt fixture: a reader that proves nothing is not taken as proved`);
  return { files: names.length, problems };
}
