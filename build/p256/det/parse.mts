/**
 * Phase 256 prototype — the tree-sitter layer of the DETERMINISTIC half.
 *
 * RESEARCH PROTOTYPE. Nothing here ships and nothing under src/ was touched.
 *
 * It reuses Tortie's OWN language readers rather than re-writing them:
 * `src/main/symbols/paths.ts` answers where the grammar wasm lives (the same
 * module the shipped worker pool asks), `src/main/symbols/languages.ts`
 * answers which grammar reads which extension, and `src/main/symbols/
 * extract.ts`'s SymbolExtractor answers definitions and imports. What this
 * file ADDS is the thing the shipped queries do not capture and which every
 * semantic fact in this prototype stands on: CALL SITES, DECORATORS and
 * ATTRIBUTES, with the callee text, the string-literal arguments and the line.
 *
 * The node-type table below was MEASURED rather than remembered: every row was
 * read off `rootNode.toString()` for a sample of that language, by
 * `build/p256/det/_probe-nodes.mts`, on 2026-09-10.
 */

import { readFileSync } from 'node:fs';
import { Language, Parser, type Node as TsNode } from 'web-tree-sitter';
import { runtimeWasmPath, grammarPath } from '../../../src/main/symbols/paths';
import { grammarFor, type GrammarId } from '../../../src/main/symbols/languages';

export interface CallSite {
  /** Callee source text, whitespace collapsed, capped. `ipcMain.handle`. */
  callee: string;
  /** Final identifier segment of the callee. `handle`. */
  last: string;
  /** Receiver before the final segment, or ''. `ipcMain`. */
  recv: string;
  /** String-literal arguments in order, quotes off. Non-string args are ''. */
  args: string[];
  /** How many arguments the call has in total (string or not). */
  argc: number;
  line: number;
  /** 'call' | 'new' | 'decorator' | 'attribute' | 'macro' */
  form: string;
}

/**
 * One locally declared function that forwards a parameter into a call on a
 * WELL-KNOWN api. `handle(ipc, 'arch:load', fn)` in this repository's own
 * `src/main/typed-ipc.ts` is the shape: `ipcMain.handle` is reached with the
 * wrapper's OWN `channel` parameter, so every call site of `handle` is an IPC
 * registration that no rule reading the callee name can see. Measured on this
 * repository 2026-09-10: 0 of 229 channels found before this pass.
 */
export interface WrapperDecl {
  /** The declared function's name. */
  name: string;
  /** The inner callee text, e.g. `ipc.handle`. */
  innerCallee: string;
  /** Index, in the WRAPPER's parameter list, of the parameter forwarded. */
  paramIndex: number;
  /** Index, in the INNER call's argument list, where that parameter lands. */
  innerIndex: number;
  line: number;
  /** Final segment of the inner callee. An ANCHOR name resolves at hop 1. */
  innerLast: string;
  /** How many hops from an anchor. 1 once resolved directly. */
  hops: number;
}

interface GrammarShape {
  /** Node types that are a call. */
  calls: readonly string[];
  /** Node types that are a construction (`new X()`). */
  news: readonly string[];
  /** Node types that hold the argument list. */
  argLists: readonly string[];
  /** Node types that are a string literal. */
  strings: readonly string[];
  /** Node types that are a decorator / attribute / annotation. */
  decorators: readonly string[];
  /** Node types that are a macro invocation (rust). */
  macros: readonly string[];
  /** Node types that declare a named function. */
  decls: readonly string[];
  /** Node types that hold a declaration's parameter list. */
  params: readonly string[];
}

/** Measured 2026-09-10 with `_probe-nodes.mts` against the shipped grammars. */
const SHAPES: Readonly<Record<GrammarId, GrammarShape>> = {
  typescript: {
    calls: ['call_expression'],
    news: ['new_expression'],
    argLists: ['arguments'],
    strings: ['string', 'template_string'],
    decorators: ['decorator'],
    macros: [],
    decls: ['function_declaration', 'method_definition', 'function_expression', 'arrow_function', 'variable_declarator'],
    params: ['formal_parameters']
  },
  tsx: {
    calls: ['call_expression'],
    news: ['new_expression'],
    argLists: ['arguments'],
    strings: ['string', 'template_string'],
    decorators: ['decorator'],
    macros: [],
    decls: ['function_declaration', 'method_definition', 'function_expression', 'arrow_function', 'variable_declarator'],
    params: ['formal_parameters']
  },
  javascript: {
    calls: ['call_expression'],
    news: ['new_expression'],
    argLists: ['arguments'],
    strings: ['string', 'template_string'],
    decorators: ['decorator'],
    macros: [],
    decls: ['function_declaration', 'method_definition', 'function_expression', 'arrow_function', 'variable_declarator'],
    params: ['formal_parameters']
  },
  python: {
    calls: ['call'],
    news: [],
    argLists: ['argument_list'],
    strings: ['string', 'concatenated_string'],
    decorators: ['decorator'],
    macros: [],
    decls: ['function_definition'],
    params: ['parameters']
  },
  go: {
    calls: ['call_expression'],
    news: ['composite_literal'],
    argLists: ['argument_list'],
    strings: ['interpreted_string_literal', 'raw_string_literal'],
    decorators: [],
    macros: [],
    decls: ['function_declaration', 'method_declaration'],
    params: ['parameter_list']
  },
  rust: {
    calls: ['call_expression'],
    news: [],
    argLists: ['arguments', 'token_tree'],
    strings: ['string_literal', 'raw_string_literal'],
    decorators: ['attribute_item', 'inner_attribute_item'],
    macros: ['macro_invocation'],
    decls: ['function_item'],
    params: ['parameters']
  },
  ruby: {
    calls: ['call', 'method_call'],
    news: [],
    argLists: ['argument_list'],
    // A SYMBOL is read as a literal here. Rails writes a member route as
    // `get :activity`, and 116 of the 121 route declarations this prototype
    // missed on mastodon carried a symbol rather than a string, measured
    // 2026-09-10.
    strings: ['string', 'simple_symbol'],
    decorators: [],
    macros: [],
    decls: ['method', 'singleton_method'],
    params: ['method_parameters']
  },
  java: {
    calls: ['method_invocation'],
    news: ['object_creation_expression'],
    argLists: ['argument_list', 'annotation_argument_list'],
    strings: ['string_literal'],
    decorators: ['annotation', 'marker_annotation'],
    macros: [],
    decls: ['method_declaration'],
    params: ['formal_parameters']
  },
  php: {
    calls: ['function_call_expression', 'member_call_expression', 'scoped_call_expression'],
    news: ['object_creation_expression'],
    argLists: ['arguments'],
    strings: ['string', 'encapsed_string'],
    decorators: ['attribute'],
    macros: [],
    decls: ['function_definition', 'method_declaration'],
    params: ['formal_parameters']
  },
  'c-sharp': {
    calls: ['invocation_expression'],
    news: ['object_creation_expression'],
    argLists: ['argument_list', 'attribute_argument_list'],
    strings: ['string_literal', 'verbatim_string_literal', 'raw_string_literal'],
    decorators: ['attribute'],
    macros: [],
    decls: ['method_declaration'],
    params: ['parameter_list']
  },
  swift: {
    calls: ['call_expression'],
    news: [],
    argLists: ['value_arguments'],
    strings: ['line_string_literal', 'multi_line_string_literal'],
    decorators: ['attribute'],
    macros: [],
    decls: ['function_declaration'],
    params: ['parameter']
  },
  kotlin: {
    calls: ['call_expression'],
    news: [],
    argLists: ['value_arguments'],
    strings: ['string_literal'],
    decorators: ['annotation'],
    macros: [],
    decls: ['function_declaration'],
    params: ['function_value_parameters']
  },
  objc: {
    calls: ['call_expression', 'message_expression'],
    news: [],
    argLists: ['argument_list', 'message_argument_list'],
    strings: ['string_literal'],
    decorators: [],
    macros: ['preproc_call'],
    decls: ['function_definition', 'method_definition'],
    params: ['parameter_list']
  }
};

const MAX_CALLEE = 160;
const MAX_ARG = 400;

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Strip one layer of quotes / string delimiters from a literal's text. */
export function unquote(raw: string): string {
  let s = raw.trim();
  // rust r"..", r#".."#, c# @"..", python f"..", go `..`, php <<<HEREDOC skipped
  s = s.replace(/^(?:[rbfu]{1,2}|@|r#*)/i, '');
  const m = /^(['"`])([\s\S]*)\1$/.exec(s);
  if (m) return m[2];
  const m2 = /^"""([\s\S]*)"""$/.exec(s);
  if (m2) return m2[1];
  const m3 = /^#*"([\s\S]*)"#*$/.exec(s);
  if (m3) return m3[1];
  return s;
}

function isString(shape: GrammarShape, n: TsNode): boolean {
  return shape.strings.includes(n.type);
}

/**
 * The string value of an argument node, or '' — one level of unwrapping for
 * the grammars that wrap an argument (`(argument (string ...))` in php and
 * c-sharp, `(value_argument value: (…))` in swift/kotlin).
 */
function argString(shape: GrammarShape, n: TsNode): string {
  if (isString(shape, n)) return unquote(n.text).slice(0, MAX_ARG);
  if (n.namedChildCount === 1) {
    const c = n.namedChild(0);
    if (c && isString(shape, c)) return unquote(c.text).slice(0, MAX_ARG);
  }
  // ruby `to: "a#b"` — a pair whose value is a string; keep the value.
  for (let i = 0; i < n.namedChildCount; i += 1) {
    const c = n.namedChild(i);
    if (c && isString(shape, c) && n.namedChildCount <= 2) {
      return unquote(c.text).slice(0, MAX_ARG);
    }
  }
  return '';
}

function findArgList(shape: GrammarShape, call: TsNode): TsNode | null {
  const byField = call.childForFieldName('arguments');
  if (byField && shape.argLists.includes(byField.type)) return byField;
  // swift/kotlin nest the arguments inside a call_suffix.
  const stack: TsNode[] = [];
  for (let i = 0; i < call.namedChildCount; i += 1) {
    const c = call.namedChild(i);
    if (c) stack.push(c);
  }
  let depth = 0;
  while (stack.length > 0 && depth < 200) {
    depth += 1;
    const n = stack.shift()!;
    if (shape.argLists.includes(n.type)) return n;
    if (n.type === 'call_suffix' || n.type === 'annotation_argument_list' || n.type === 'attribute_argument_list') {
      for (let i = 0; i < n.namedChildCount; i += 1) {
        const c = n.namedChild(i);
        if (c) stack.push(c);
      }
    }
  }
  return null;
}

function calleeOf(shape: GrammarShape, call: TsNode, argList: TsNode | null): string {
  if (call.type === 'member_call_expression' || call.type === 'scoped_call_expression') {
    const obj = call.childForFieldName('object') ?? call.childForFieldName('scope');
    const nm = call.childForFieldName('name');
    if (nm) return collapse((obj ? `${obj.text}.` : '') + nm.text).slice(0, MAX_CALLEE);
  }
  const byField = call.childForFieldName('function') ?? call.childForFieldName('method');
  if (byField) {
    // java's method_invocation puts the receiver in `object` and the name in `name`
    if (call.type === 'method_invocation') {
      const obj = call.childForFieldName('object');
      return collapse((obj ? `${obj.text}.` : '') + byField.text).slice(0, MAX_CALLEE);
    }
    return collapse(byField.text).slice(0, MAX_CALLEE);
  }
  if (
    call.type === 'method_invocation' ||
    call.type === 'call' ||
    call.type === 'member_call_expression' ||
    call.type === 'scoped_call_expression'
  ) {
    const obj =
      call.childForFieldName('object') ??
      call.childForFieldName('receiver') ??
      call.childForFieldName('scope');
    const nm = call.childForFieldName('name') ?? call.childForFieldName('method');
    if (nm) return collapse((obj ? `${obj.text}.` : '') + nm.text).slice(0, MAX_CALLEE);
  }
  // swift/kotlin/objc: the callee is the first named child that is not the args.
  for (let i = 0; i < call.namedChildCount; i += 1) {
    const c = call.namedChild(i);
    if (!c) continue;
    if (argList && c.id === argList.id) continue;
    if (shape.argLists.includes(c.type)) continue;
    if (c.type === 'call_suffix') continue;
    return collapse(c.text).slice(0, MAX_CALLEE);
  }
  return '';
}

function splitCallee(callee: string): { last: string; recv: string } {
  const cleaned = callee.replace(/\([^)]*\)/g, '').replace(/<[^>]*>/g, '');
  const parts = cleaned.split(/::|->|\.|\$|:/).map((p) => p.trim()).filter((p) => p.length > 0);
  if (parts.length === 0) return { last: cleaned, recv: '' };
  return { last: parts[parts.length - 1], recv: parts.length > 1 ? parts[parts.length - 2] : '' };
}

export class CallReader {
  private readonly loaded = new Map<GrammarId, { lang: Language; parser: Parser } | null>();

  private constructor() {}

  static async create(): Promise<CallReader> {
    const rt = runtimeWasmPath();
    await Parser.init({ locateFile: (n: string) => (n.endsWith('.wasm') ? rt : n) });
    return new CallReader();
  }

  private async grammar(id: GrammarId) {
    const cached = this.loaded.get(id);
    if (cached !== undefined) return cached;
    let out: { lang: Language; parser: Parser } | null = null;
    try {
      const lang = await Language.load(grammarPath(id));
      const parser = new Parser();
      parser.setLanguage(lang);
      out = { lang, parser };
    } catch {
      out = null;
    }
    this.loaded.set(id, out);
    return out;
  }

  /** Every call, construction, decorator and macro in one file. */
  async read(
    relPath: string,
    source: string
  ): Promise<{ lang: GrammarId; sites: CallSite[]; wrappers: WrapperDecl[] } | null> {
    const id = grammarFor(relPath);
    if (id === null) return null;
    const g = await this.grammar(id);
    if (g === null) return null;
    const shape = SHAPES[id];
    let tree: ReturnType<Parser['parse']> = null;
    try {
      tree = g.parser.parse(source);
      if (tree === null) return null;
      const sites: CallSite[] = [];
      walk(tree.rootNode, shape, sites);
      const wrappers = readWrappers(tree.rootNode, shape);
      return { lang: id, sites, wrappers };
    } catch {
      return null;
    } finally {
      tree?.delete();
    }
  }

  async readFile(relPath: string, absPath: string) {
    if (grammarFor(relPath) === null) return null;
    let buf: Buffer;
    try {
      buf = readFileSync(absPath);
    } catch {
      return null;
    }
    if (buf.subarray(0, 8192).includes(0)) return null;
    if (buf.length > 4 * 1024 * 1024) return null;
    return this.read(relPath, buf.toString('utf8'));
  }

  dispose(): void {
    for (const g of this.loaded.values()) {
      try {
        g?.parser.delete();
      } catch {
        /* best effort */
      }
    }
    this.loaded.clear();
  }
}

const MAX_NODES = 400_000;

function walk(root: TsNode, shape: GrammarShape, out: CallSite[]): void {
  const stack: TsNode[] = [root];
  let seen = 0;
  while (stack.length > 0) {
    const n = stack.pop()!;
    seen += 1;
    if (seen > MAX_NODES) return;
    const t = n.type;
    let form: string | null = null;
    if (shape.calls.includes(t)) form = 'call';
    else if (shape.news.includes(t)) form = 'new';
    else if (shape.decorators.includes(t)) form = 'decorator';
    else if (shape.macros.includes(t)) form = 'macro';
    if (form !== null) {
      const site = describe(n, shape, form);
      if (site !== null) out.push(site);
    }
    for (let i = 0; i < n.namedChildCount; i += 1) {
      const c = n.namedChild(i);
      if (c) stack.push(c);
    }
  }
}

function describe(n: TsNode, shape: GrammarShape, form: string): CallSite | null {
  const line = n.startPosition.row + 1;
  if (form === 'decorator' || form === 'macro') {
    // A decorator/attribute wraps a call OR a bare name. Read whichever.
    const inner = n.namedChild(0);
    const target = inner && shape.calls.includes(inner.type) ? inner : n;
    const argList = findArgList(shape, target) ?? findArgList(shape, n);
    const callee =
      target.id === n.id
        ? collapse(n.text.replace(/^[@#!\[]+/, '').replace(/\(.*$/s, '').replace(/\]$/, '')).slice(0, MAX_CALLEE)
        : calleeOf(shape, target, argList);
    const { last, recv } = splitCallee(callee);
    const { args, argc } = readArgs(shape, argList);
    return { callee, last, recv, args, argc, line, form };
  }
  const argList = findArgList(shape, n);
  const callee = calleeOf(shape, n, argList);
  if (callee === '') return null;
  const { last, recv } = splitCallee(callee);
  const { args, argc } = readArgs(shape, argList);
  return { callee, last, recv, args, argc, line, form };
}

function readArgs(shape: GrammarShape, argList: TsNode | null): { args: string[]; argc: number } {
  if (argList === null) return { args: [], argc: 0 };
  const args: string[] = [];
  let argc = 0;
  for (let i = 0; i < argList.namedChildCount && i < 12; i += 1) {
    const c = argList.namedChild(i);
    if (!c) continue;
    argc += 1;
    args.push(argString(shape, c));
  }
  return { args, argc };
}

/**
 * ANCHOR APIs a local wrapper may hide. The key is the inner callee's final
 * segment; the value is which argument of the inner call carries the name.
 *
 * This is the whole generality claim of the wrapper pass and it is a small
 * one: it resolves ONE hop, from a function declared in the repository to a
 * call on one of these names inside it. Two hops are not followed, and a
 * wrapper reached through an object property or a class method table is not
 * found. Both limits are measured in the notes.
 */
/**
 * Close the wrapper graph, bounded at `maxHops`. A candidate whose inner
 * callee is itself a resolved wrapper, and whose forwarded argument lands in
 * that wrapper's own name position, becomes resolved with the anchor's callee.
 */
export function closeWrappers(
  candidates: readonly WrapperDecl[],
  maxHops = 3,
  own: readonly WrapperDecl[] = []
): Map<string, WrapperDecl> {
  const resolved = new Map<string, WrapperDecl>();
  // Hop 1: a declaration that forwards straight into an anchor api.
  for (const c of candidates) {
    if (c.hops === 1 && !resolved.has(c.name)) resolved.set(c.name, c);
  }
  // Hops 2..max: a declaration that forwards into a declaration already
  // resolved, with the forwarded argument landing in that one's name position.
  const pending = candidates.filter((c) => c.hops !== 1);
  for (let hop = 2; hop <= maxHops; hop += 1) {
    let grew = false;
    for (const c of pending) {
      if (resolved.has(c.name)) continue;
      const inner = resolved.get(c.innerLast);
      if (inner === undefined) continue;
      if (c.innerIndex !== inner.paramIndex) continue;
      resolved.set(c.name, { ...c, innerCallee: inner.innerCallee, innerLast: inner.innerLast, hops: hop });
      grew = true;
    }
    if (!grew) break;
  }
  // A CALLER'S OWN declaration shadows whatever the project-wide pass settled
  // on, whether or not that name was already resolved. This is what makes two
  // declarations of one name with two different signatures both answerable.
  for (const c of own) {
    if (c.hops === 1) {
      resolved.set(c.name, c);
      continue;
    }
    const inner = resolved.get(c.innerLast);
    if (inner === undefined) continue;
    if (c.innerIndex !== inner.paramIndex) continue;
    resolved.set(c.name, { ...c, innerCallee: inner.innerCallee, innerLast: inner.innerLast, hops: inner.hops + 1 });
  }
  return resolved;
}

export const ANCHORS: Readonly<Record<string, number>> = {
  handle: 0,
  handleOnce: 0,
  on: 0,
  once: 0,
  invoke: 0,
  send: 0,
  addEventListener: 0,
  HandleFunc: 0,
  Handle: 0,
  route: 0,
  get: 0,
  post: 0,
  put: 0,
  patch: 0,
  delete: 0,
  spawn: 0,
  spawnSync: 0,
  exec: 0,
  execFile: 0,
  execFileSync: 0,
  execSync: 0,
  Command: 0,
  run: 0,
  Popen: 0
};

/** Parameter identifier names of a declaration, in order. */
function paramNames(shape: GrammarShape, decl: TsNode): string[] {
  let list: TsNode | null = decl.childForFieldName('parameters');
  if (list === null) {
    for (let i = 0; i < decl.namedChildCount; i += 1) {
      const c = decl.namedChild(i);
      if (c && shape.params.includes(c.type)) {
        list = c;
        break;
      }
    }
  }
  if (list === null) return [];
  const out: string[] = [];
  for (let i = 0; i < list.namedChildCount && i < 16; i += 1) {
    const c = list.namedChild(i);
    if (!c) continue;
    const nm = c.childForFieldName('name') ?? c.childForFieldName('pattern') ?? c;
    out.push(collapse(nm.text).replace(/[?:].*$/, '').trim());
  }
  return out;
}

function declName(decl: TsNode): string {
  const n = decl.childForFieldName('name');
  if (n) return collapse(n.text);
  // `const handle = (…) => …`
  if (decl.type === 'variable_declarator') {
    const id = decl.namedChild(0);
    if (id) return collapse(id.text);
  }
  return '';
}

/** Every one-hop wrapper of an ANCHOR api declared in one file. */
export function readWrappers(root: TsNode, shape: GrammarShape): WrapperDecl[] {
  const out: WrapperDecl[] = [];
  const stack: TsNode[] = [root];
  let seen = 0;
  while (stack.length > 0 && seen < MAX_NODES) {
    const n = stack.pop()!;
    seen += 1;
    for (let i = 0; i < n.namedChildCount; i += 1) {
      const c = n.namedChild(i);
      if (c) stack.push(c);
    }
    if (!shape.decls.includes(n.type)) continue;
    const name = declName(n);
    if (name === '' || name.length > 60) continue;
    const params = paramNames(shape, n);
    if (params.length === 0) continue;
    // Every call inside this declaration.
    const inner: TsNode[] = [];
    const sub: TsNode[] = [n];
    let seen2 = 0;
    while (sub.length > 0 && seen2 < 4000) {
      const m = sub.pop()!;
      seen2 += 1;
      if (m.id !== n.id && shape.decls.includes(m.type)) continue; // do not cross into a nested declaration
      if (shape.calls.includes(m.type) || shape.news.includes(m.type)) inner.push(m);
      for (let i = 0; i < m.namedChildCount; i += 1) {
        const c = m.namedChild(i);
        if (c) sub.push(c);
      }
    }
    let emitted = 0;
    for (const call of inner) {
      if (emitted >= 6) break;
      const argList = findArgList(shape, call);
      if (argList === null) continue;
      const callee = calleeOf(shape, call, argList);
      const { last } = splitCallee(callee);
      // Which inner argument is a bare parameter of this declaration? Every
      // forwarding is recorded, anchor or not, so the driver can close a
      // SECOND hop: `src/main/ipc.ts`'s `handle` forwards into `handleTyped`,
      // which is itself the wrapper, and 26 of this repository's 229 channels
      // sit behind exactly that shape (measured 2026-09-10).
      for (let i = 0; i < argList.namedChildCount && i < 8; i += 1) {
        const a = argList.namedChild(i);
        if (!a) continue;
        const t = collapse(a.text);
        const pi = params.indexOf(t);
        if (pi < 0) continue;
        out.push({
          name,
          innerCallee: callee,
          paramIndex: pi,
          innerIndex: i,
          innerLast: last,
          hops: ANCHORS[last] === i ? 1 : 0,
          line: n.startPosition.row + 1
        });
        emitted += 1;
        break;
      }
    }
  }
  return out;
}

/**
 * Rewrite a call site that goes through a known wrapper into the site the
 * anchor api would have produced, so the SAME rule table answers it.
 */
export function unwrap(site: CallSite, wrappers: ReadonlyMap<string, WrapperDecl>): CallSite | null {
  // A BARE call only. Keying on the final segment alone made `sock.on('data')`
  // resolve against a wrapper declared as `on`, which put 41 emitter events
  // into this repository's IPC channel list, measured 2026-09-10.
  if (site.recv !== '') return null;
  if (site.form !== 'call') return null;
  const w = wrappers.get(site.last);
  if (w === undefined) return null;
  if (site.args.length <= w.paramIndex) return null;
  const name = site.args[w.paramIndex];
  if (name === '') return null;
  const shifted = site.args.slice();
  shifted.splice(0, w.paramIndex);
  const { last, recv } = splitCallee(w.innerCallee);
  return { ...site, callee: w.innerCallee, last, recv, args: shifted, form: 'call' };
}
