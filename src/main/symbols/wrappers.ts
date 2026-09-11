/**
 * The wrapper DECLARATION walk (Phase 257, research 118 §6.3).
 *
 * One locally declared function that forwards a parameter into a call on a
 * WELL KNOWN api is a wrapper. `handle(ipc, 'arch:load', fn)` in this
 * repository's own `src/main/typed-ipc.ts` is the shape: `ipc.handle` is
 * reached with the wrapper's OWN `channel` parameter, so every call site of
 * `handle` is an IPC registration that no rule reading the callee name can
 * see. Measured on this repository 2026-09-10: 0 of 229 channels before the
 * pass, 229 of 229 after it.
 *
 * This module finds the declarations, in the worker, from the tree the symbol
 * query already parsed. CLOSING the map over them, being the hops past the
 * first and a caller's own declaration shadowing the project wide one, is
 * `src/main/arch/facts/wrappers.ts`'s job in main, over the declarations of
 * every file. The one table both sides read is `ARCH_WRAPPER_ANCHORS` in
 * `@shared/arch`, because the arch directory has one door for the rest of
 * main and this module is on the other side of it.
 *
 * Two of the three measured clauses live here. Every forwarding is recorded,
 * anchor or not, so the closure can follow a SECOND hop; and the inner name is
 * rewritten through the file's own import aliases AT EXTRACTION, so
 * `import { handle as handleTyped }` followed by `handleTyped(ipcMain, channel,
 * fn)` arrives as a forwarding into `handle`, which the closure can then find.
 * 26 of this repository's 229 channels sit behind exactly that shape.
 *
 * It runs over the JavaScript family only (`ARCH_WRAPPER_GRAMMARS`), because
 * every clause was measured on this repository's TypeScript and §6.3 counted
 * 2 wrapper only facts across the eight repositories in the other families.
 *
 * Stated limits, measured rather than assumed: one declared function to one
 * call, and a wrapper reached through an object property or a class method
 * table is not found. A function held in a `const` as an arrow function is
 * read only when its parameters sit on the declaration the walk names, which
 * is the prototype's own reach and the reach the 229 was measured with.
 */

import { ARCH_WRAPPER_ANCHORS, ARCH_WRAPPER_GRAMMARS } from '@shared/arch';
import type { Node as TsNode } from 'web-tree-sitter';
import { CALL_SHAPES, calleeOf, findArgList, isCallNode, splitCallee, type CallShape } from './calls';
import type { GrammarId } from './languages';

/** One declared function that forwards a parameter into a call. */
export interface ExtractedWrapper {
  /** The declared function's name. */
  name: string;
  /** The inner callee text, e.g. `ipc.handle`. */
  innerCallee: string;
  /** Final segment of the inner callee, already alias resolved. An ANCHOR name resolves at hop 1. */
  innerLast: string;
  /** Index, in the WRAPPER's parameter list, of the parameter forwarded. */
  paramIndex: number;
  /** Index, in the INNER call's argument list, where that parameter lands. */
  innerIndex: number;
  /** 1 when the inner callee is an anchor at that argument, else 0: an unresolved candidate. */
  hops: number;
  /** 1 based line of the declaration. */
  line: number;
}

/** Does the wrapper walk run over this grammar? */
export function wrapperGrammar(grammar: GrammarId): boolean {
  return ARCH_WRAPPER_GRAMMARS.includes(grammar);
}

/** Nodes visited before the walk gives up on a file. */
const MAX_NODES = 400_000;
/** Nodes visited inside one declaration. */
const MAX_INNER_NODES = 4_000;
/** Forwardings recorded per declaration. */
const MAX_PER_DECL = 6;
/** Inner arguments looked at per call. */
const MAX_INNER_ARGS = 8;
/** Parameters read per declaration. */
const MAX_PARAMS = 16;

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * `local name → exported name` for the ES aliasing import form,
 * `import { a as b }` and `import type { a as b }`. A language whose imports
 * cannot rename would answer an empty map; the pass runs over the JavaScript
 * family alone, so only that form is read.
 */
export function importAliases(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.matchAll(/\bimport\s*(?:type\s*)?\{([^}]{0,2000})\}/g)) {
    for (const part of (m[1] ?? '').split(',')) {
      const a = /^\s*(?:type\s+)?([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)\s*$/.exec(part);
      if (a !== null && a[1] !== undefined && a[2] !== undefined) out.set(a[2], a[1]);
    }
  }
  return out;
}

/** Parameter identifier names of a declaration, in order. */
function paramNames(shape: CallShape, decl: TsNode): string[] {
  let list: TsNode | null = decl.childForFieldName('parameters');
  if (list === null) {
    for (let i = 0; i < decl.namedChildCount; i += 1) {
      const c = decl.namedChild(i);
      if (c !== null && shape.params.includes(c.type)) {
        list = c;
        break;
      }
    }
  }
  if (list === null) return [];
  const out: string[] = [];
  for (let i = 0; i < list.namedChildCount && i < MAX_PARAMS; i += 1) {
    const c = list.namedChild(i);
    if (c === null) continue;
    const nm = c.childForFieldName('name') ?? c.childForFieldName('pattern') ?? c;
    out.push(collapse(nm.text).replace(/[?:].*$/, '').trim());
  }
  return out;
}

function declName(decl: TsNode): string {
  const n = decl.childForFieldName('name');
  if (n !== null) return collapse(n.text);
  // `const handle = (…) => …`
  if (decl.type === 'variable_declarator') {
    const id = decl.namedChild(0);
    if (id !== null) return collapse(id.text);
  }
  return '';
}

/**
 * Every forwarding declaration in one file, alias resolved. `[]` for a
 * grammar the pass does not run over.
 */
export function readWrapperDecls(root: TsNode, grammar: GrammarId, text: string): ExtractedWrapper[] {
  if (!wrapperGrammar(grammar)) return [];
  const shape = CALL_SHAPES[grammar];
  const aliases = importAliases(text);
  const out: ExtractedWrapper[] = [];
  const stack: TsNode[] = [root];
  let seen = 0;
  while (stack.length > 0 && seen < MAX_NODES) {
    const n = stack.pop();
    if (n === undefined) break;
    seen += 1;
    for (let i = 0; i < n.namedChildCount; i += 1) {
      const c = n.namedChild(i);
      if (c !== null) stack.push(c);
    }
    if (!shape.decls.includes(n.type)) continue;
    const name = declName(n);
    if (name === '' || name.length > 60) continue;
    const params = paramNames(shape, n);
    if (params.length === 0) continue;
    // Every call inside this declaration, without crossing into a nested one.
    const inner: TsNode[] = [];
    const sub: TsNode[] = [n];
    let seenInner = 0;
    while (sub.length > 0 && seenInner < MAX_INNER_NODES) {
      const m = sub.pop();
      if (m === undefined) break;
      seenInner += 1;
      if (m.id !== n.id && shape.decls.includes(m.type)) continue;
      if (isCallNode(grammar, m)) inner.push(m);
      for (let i = 0; i < m.namedChildCount; i += 1) {
        const c = m.namedChild(i);
        if (c !== null) sub.push(c);
      }
    }
    let emitted = 0;
    for (const call of inner) {
      if (emitted >= MAX_PER_DECL) break;
      const argList = findArgList(shape, call);
      if (argList === null) continue;
      const callee = calleeOf(shape, call, argList);
      const { last } = splitCallee(callee);
      // THE IMPORT ALIAS IS RESOLVED HERE, at extraction, so the declaration
      // arrives naming the export it really reaches (clause 2 of §6.3).
      const innerLast = aliases.get(last) ?? last;
      for (let i = 0; i < argList.namedChildCount && i < MAX_INNER_ARGS; i += 1) {
        const a = argList.namedChild(i);
        if (a === null) continue;
        const pi = params.indexOf(collapse(a.text));
        if (pi < 0) continue;
        out.push({
          name,
          innerCallee: callee,
          innerLast,
          paramIndex: pi,
          innerIndex: i,
          hops: ARCH_WRAPPER_ANCHORS[innerLast] === i ? 1 : 0,
          line: n.startPosition.row + 1
        });
        emitted += 1;
        break;
      }
    }
  }
  return out;
}
