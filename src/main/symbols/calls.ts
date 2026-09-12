/**
 * A captured call site, decorator, attribute or macro → one record (Phase 257,
 * research 118 §6).
 *
 * The queries in `./queries.ts` capture the NODE of every call shaped thing in
 * the grammars the fact base reads (`CALL_BY_CAPTURE` there is the table), and
 * this module turns one such node into the one shape every rule in
 * `src/main/arch/facts/` reads: the callee text, its last segment and its
 * receiver, the string literal arguments with their quotes off, the argument
 * count, the line and the form. Nothing here reads a file, and nothing here
 * decides what a call MEANS; a rule does that, and a rule never sees a node.
 *
 * It is the port of `build/p256/det/parse.mts`, the reference implementation
 * research 118 measured at 79% precision over nine repositories, and every
 * per grammar node name below was READ OFF `rootNode.toString()` against the
 * shipped wasm on 2026-09-10 and again on 2026-09-11 rather than remembered.
 * Where this file could have improved on the prototype it did not, on purpose:
 * the numbers were measured with exactly these shapes, and a change here moves
 * them without anybody re-judging a row. THE ONE EXCEPTION IS RUBY'S RECEIVER,
 * read by `calleeOf` below since the Phase 257 fix round and re-measured over
 * the corpus in the same round (mastodon's network facts 367 → 29, its kv
 * writes 36 → 92). The five grammars the corpus does not
 * exercise, being java, php, c-sharp, kotlin and objc, are present in the shape
 * table with EMPTY sets so the record type is total, and they answer no call at
 * all (spec D4).
 *
 * A CONCATENATED ARGUMENT READS ITS FIRST LITERAL, AND PHASE 261 MEASURED
 * THAT IT MUST STAY THAT WAY. `argString`'s last loop returns the first string
 * child of any node with at most two named children, which is there to unwrap
 * a ruby `to: "a#b"` pair and a swift `value_argument`, and a concatenation is
 * the same shape, so `app.get('/' + 'a', h)` declares `/a` and is reported as
 * `/`. No RULE can tell that from a real root route, because the rule is
 * handed the string `/` and nothing else, which is why the obvious fix was
 * tried HERE: the joining nodes are a CLOSED set and were read off the shipped
 * wasm on 2026-09-12 — `binary_expression` in js/ts/tsx, go and rust,
 * `binary_operator` in python, `binary` in ruby and `additive_expression` in
 * swift — so a node of one of those types could simply answer ''.
 *
 * IT WAS REFUSED ON THE MEASUREMENT, and the measurement refutes the argument
 * for it. "Precision cannot fall, because a row removed is a row whose subject
 * was never the value the code holds" is false for the two rules that read a
 * PREFIX rather than a whole value. Driven over the eight committed fixtures
 * and this checkout's own `src/` with and without the clause
 * (`build/p261/spec-probe.mts --capture`, then `--diff`), the fact set went
 * 18,869 → 18,813: **56 rows lost, 0 gained, every one of them in `src/` and
 * every one of them correct** — 46 `gate.refusal` and 10 `store.sql`, and in
 * every case an ordinary long string wrapped across two lines with a `+`: a
 * refusal message written as two template halves, and a schema statement
 * written as two quoted halves. The first half of a wrapped message IS the
 * message, and the first half of a wrapped statement IS its keyword and its
 * table, so both rules were reading exactly what they meant to read.
 *
 * So the class is stated rather than closed, and the sentence above this one
 * is why: a path wants the whole value and a message wants its prefix, and
 * that is a judgement a RULE makes about its own subject, not something this
 * file can know about a node. Closing it belongs to a phase that can re-judge
 * the rows on both sides — narrowing it per rule, or reading the joined value
 * whole — and not to a nits round, whose charter is to move no measured
 * number. The stated cost is recall on a repository that writes a route or a
 * URL as a concatenation.
 */

import type { Node as TsNode } from 'web-tree-sitter';
import type { GrammarId } from './languages';

/** How a captured site was written. Provenance for a rule, never a verdict. */
export type CallForm = 'call' | 'new' | 'decorator' | 'attribute' | 'macro';

/** One call site as a rule reads it. */
export interface ExtractedCall {
  /** Callee source text, whitespace collapsed, cut at MAX_CALLEE. `ipcMain.handle`. */
  callee: string;
  /** Final identifier segment of the callee. `handle`. */
  last: string;
  /** The segment before the final one, or ''. `ipcMain`. */
  recv: string;
  /** String literal arguments in order, quotes off, '' for a non string argument. */
  args: string[];
  /** How many arguments the call has in total, string or not, at most MAX_ARGS. */
  argc: number;
  /** 1 based. */
  line: number;
  form: CallForm;
}

/**
 * The worker stops capturing call sites at this many and flags the file
 * `callsTruncated`. `src/main/arch/facts/limits.ts` states the same number as
 * the fact base's own ceiling, and `conformance:facts` rule 15 drives THIS
 * one rather than reading either table.
 */
export const MAX_CALLS_PER_FILE = 20_000;

/** Callee text is cut here. */
export const MAX_CALLEE = 160;
/** One string argument, quotes off, is cut here. */
export const MAX_ARG = 400;
/** Arguments read per call site. */
export const MAX_ARGS = 12;

/** The node types one grammar spells a call's parts with. */
export interface CallShape {
  /** Node types that hold the argument list. */
  readonly argLists: readonly string[];
  /** Node types that are a string literal. */
  readonly strings: readonly string[];
  /** Node types that declare a named function; the wrapper walk reads these. */
  readonly decls: readonly string[];
  /** Node types that hold a declaration's parameter list. */
  readonly params: readonly string[];
}

const JS_SHAPE: CallShape = {
  argLists: ['arguments'],
  strings: ['string', 'template_string'],
  decls: [
    'function_declaration',
    'method_definition',
    'function_expression',
    'arrow_function',
    'variable_declarator'
  ],
  params: ['formal_parameters']
};

const NONE: CallShape = { argLists: [], strings: [], decls: [], params: [] };

/** Measured 2026-09-10 (`_probe-nodes.mts`) and re-measured 2026-09-11 against the shipped grammars. */
export const CALL_SHAPES: Readonly<Record<GrammarId, CallShape>> = {
  typescript: JS_SHAPE,
  tsx: JS_SHAPE,
  javascript: JS_SHAPE,
  python: {
    argLists: ['argument_list'],
    strings: ['string', 'concatenated_string'],
    decls: ['function_definition'],
    params: ['parameters']
  },
  go: {
    argLists: ['argument_list'],
    strings: ['interpreted_string_literal', 'raw_string_literal'],
    decls: ['function_declaration', 'method_declaration'],
    params: ['parameter_list']
  },
  rust: {
    // A macro's arguments are a token_tree, so `println!("x")` reads its string.
    argLists: ['arguments', 'token_tree'],
    strings: ['string_literal', 'raw_string_literal'],
    decls: ['function_item'],
    params: ['parameters']
  },
  ruby: {
    argLists: ['argument_list'],
    // A SYMBOL is read as a literal. Rails writes a member route as
    // `get :activity`, and 116 of the 121 route declarations the prototype
    // missed on mastodon carried a symbol rather than a string (2026-09-10).
    // It arrives WITH its leading colon; the Rails rule strips it, nothing
    // else does.
    strings: ['string', 'simple_symbol'],
    decls: ['method', 'singleton_method'],
    params: ['method_parameters']
  },
  swift: {
    argLists: ['value_arguments'],
    strings: ['line_string_literal', 'multi_line_string_literal'],
    decls: ['function_declaration'],
    params: ['parameter']
  },
  kotlin: NONE,
  objc: NONE,
  java: NONE,
  php: NONE,
  'c-sharp': NONE
};

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * One layer of string delimiters off a literal's text, and nothing off text
 * that carries none.
 *
 * The prefix rule is what makes it safe for an import specifier too: a
 * Rust `r#"…"#`, a Python `f"…"`, a C# `@"…"` or a Go raw string each drop
 * their prefix ONLY when a quote follows it, so a bare dotted name such as
 * Python's `routes` keeps its first letter. `src/main/symbols/extract.ts`
 * strips its specifiers through this one function, so one unquote exists.
 */
export function unquoteLiteral(raw: string): string {
  const s = raw.trim();
  const prefixed = /^(?:[rbfu]{1,2}|@)(?=r?#*["'`])/i.exec(s);
  const body = prefixed === null ? s : s.slice(prefixed[0].length);
  const triple = /^"""([\s\S]*)"""$/.exec(body);
  if (triple !== null) return triple[1] ?? '';
  const plain = /^(['"`])([\s\S]*)\1$/.exec(body);
  if (plain !== null) return plain[2] ?? '';
  const raw_ = /^r?(#*)"([\s\S]*)"\1$/.exec(body);
  if (raw_ !== null) return raw_[2] ?? '';
  return body;
}

function isString(shape: CallShape, n: TsNode): boolean {
  return shape.strings.includes(n.type);
}

/**
 * The string value of an argument node, or ''. One level of unwrapping for
 * the grammars that wrap an argument, being `(value_argument value: (…))` in
 * swift, and a ruby `to: "a#b"` pair, whose value is kept.
 *
 * A CONCATENATION READS ITS FIRST LITERAL and that is a MEASURED decision
 * rather than an oversight; the module header above carries the numbers.
 */
function argString(shape: CallShape, n: TsNode): string {
  if (isString(shape, n)) return unquoteLiteral(n.text).slice(0, MAX_ARG);
  if (n.namedChildCount === 1) {
    const c = n.namedChild(0);
    if (c !== null && isString(shape, c)) return unquoteLiteral(c.text).slice(0, MAX_ARG);
  }
  for (let i = 0; i < n.namedChildCount; i += 1) {
    const c = n.namedChild(i);
    if (c !== null && isString(shape, c) && n.namedChildCount <= 2) {
      return unquoteLiteral(c.text).slice(0, MAX_ARG);
    }
  }
  return '';
}

/** The argument list node of a call, or null. Swift nests it inside a `call_suffix`. */
export function findArgList(shape: CallShape, call: TsNode): TsNode | null {
  const byField = call.childForFieldName('arguments');
  if (byField !== null && shape.argLists.includes(byField.type)) return byField;
  const stack: TsNode[] = [];
  for (let i = 0; i < call.namedChildCount; i += 1) {
    const c = call.namedChild(i);
    if (c !== null) stack.push(c);
  }
  let depth = 0;
  while (stack.length > 0 && depth < 200) {
    depth += 1;
    const n = stack.shift();
    if (n === undefined) break;
    if (shape.argLists.includes(n.type)) return n;
    if (n.type === 'call_suffix') {
      for (let i = 0; i < n.namedChildCount; i += 1) {
        const c = n.namedChild(i);
        if (c !== null) stack.push(c);
      }
    }
  }
  return null;
}

/**
 * The callee text of a call node. A `function` or `method` field answers
 * first, which is every grammar here but swift's, whose callee is the first
 * named child that is not the call suffix.
 *
 * RUBY IS THE ONE DELIBERATE DIVERGENCE FROM THE PROTOTYPE. Its `call` node
 * holds the receiver in a field of its own, `receiver`, beside `method`, and
 * `build/p256/det/parse.mts` read the `method` field alone, so `ENV.fetch('X')`,
 * `Model.create!` and `redis.set('k', 'v')` all reached the rules as bare
 * `fetch`, `create!` and `set` with an empty receiver. The Phase 257 fix round
 * measured the consequence on mastodon: 195 of its 365 `network.client` facts
 * were `ENV.fetch` and `Hash#fetch` read as a bare `fetch`, and every receiver
 * clause in the table was inert on Ruby. The receiver is composed in front of
 * the method here, `receiver.method`, exactly as the prototype composed it for
 * the grammars whose receiver field it did read (`object`, `scope`).
 */
export function calleeOf(shape: CallShape, call: TsNode, argList: TsNode | null): string {
  const byField = call.childForFieldName('function') ?? call.childForFieldName('method');
  if (byField !== null) {
    const receiver = call.type === 'call' ? call.childForFieldName('receiver') : null;
    if (receiver !== null) return collapse(`${receiver.text}.${byField.text}`).slice(0, MAX_CALLEE);
    return collapse(byField.text).slice(0, MAX_CALLEE);
  }
  for (let i = 0; i < call.namedChildCount; i += 1) {
    const c = call.namedChild(i);
    if (c === null) continue;
    if (argList !== null && c.id === argList.id) continue;
    if (shape.argLists.includes(c.type)) continue;
    if (c.type === 'call_suffix') continue;
    return collapse(c.text).slice(0, MAX_CALLEE);
  }
  return '';
}

/**
 * The final segment of a callee and the one before it. `ipcMain.handle` →
 * `handle` on `ipcMain`; `Command::new` → `new` on `Command`; call
 * parentheses and generics are dropped first, so a chained receiver reads as
 * its last name.
 */
export function splitCallee(callee: string): { last: string; recv: string } {
  const cleaned = callee.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, '');
  const parts = cleaned
    .split(/::|->|\.|\$|:/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return { last: cleaned, recv: '' };
  return { last: parts[parts.length - 1] ?? cleaned, recv: parts.length > 1 ? (parts[parts.length - 2] ?? '') : '' };
}

function readArgs(shape: CallShape, argList: TsNode | null): { args: string[]; argc: number } {
  if (argList === null) return { args: [], argc: 0 };
  const args: string[] = [];
  let argc = 0;
  for (let i = 0; i < argList.namedChildCount && i < MAX_ARGS; i += 1) {
    const c = argList.namedChild(i);
    if (c === null) continue;
    argc += 1;
    args.push(argString(shape, c));
  }
  return { args, argc };
}

/** Is this node a call or a construction in the grammar? The wrapper walk asks it too. */
export function isCallNode(grammar: GrammarId, n: TsNode): boolean {
  switch (grammar) {
    case 'typescript':
    case 'tsx':
    case 'javascript':
      return n.type === 'call_expression' || n.type === 'new_expression';
    case 'python':
    case 'ruby':
      return n.type === 'call';
    case 'go':
    case 'rust':
    case 'swift':
      return n.type === 'call_expression';
    default:
      return false;
  }
}

/**
 * One captured node → one record, or null when the node names no callee.
 *
 * A decorator, attribute or macro wraps either a call or a bare name, and
 * whichever it wraps is read: `@router.get('/p')` reads the inner call with
 * its arguments, `@click.command` reads the bare name with none, and a Rust
 * `#[tokio::test]` reads `tokio::test` with the leading punctuation off.
 */
export function describeCall(node: TsNode, grammar: GrammarId, form: CallForm): ExtractedCall | null {
  const shape = CALL_SHAPES[grammar];
  const line = node.startPosition.row + 1;
  if (form === 'decorator' || form === 'attribute' || form === 'macro') {
    const inner = node.namedChild(0);
    const target = inner !== null && isCallNode(grammar, inner) ? inner : node;
    const argList = findArgList(shape, target) ?? findArgList(shape, node);
    const callee =
      target.id === node.id
        ? collapse(
            node.text
              .replace(/^[@#!\[]+/, '')
              .replace(/\(.*$/s, '')
              .replace(/\]$/, '')
          ).slice(0, MAX_CALLEE)
        : calleeOf(shape, target, argList);
    const { last, recv } = splitCallee(callee);
    const { args, argc } = readArgs(shape, argList);
    return { callee, last, recv, args, argc, line, form };
  }
  const argList = findArgList(shape, node);
  const callee = calleeOf(shape, node, argList);
  if (callee === '') return null;
  const { last, recv } = splitCallee(callee);
  const { args, argc } = readArgs(shape, argList);
  return { callee, last, recv, args, argc, line, form };
}
