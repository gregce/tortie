/**
 * PHASE 334. THE REDLINE VIEW'S WIRING, READ AS SOURCE (build/p334/SPEC.md §5,
 * clauses W1 to W5).
 *
 * Item B, Redline remembers where you were: the view saves the scroller's
 * offset on every scroll, keyed by the tab THAT render draws, and never while
 * the skeleton shows, because the skeleton clamps the one scroller every
 * Redline tab shares to 0 (W1); it never saves in an effect cleanup, because by
 * the time a `[tab.id]` cleanup runs the shared scroller already holds the next
 * tab's picture (W2); and one layout effect puts the place back, keyed on the
 * tab and on readiness and NEVER on the picture, so an agent's write while the
 * person reads never moves them, falling back to 0 because the scroller still
 * holds the departing tab's offset (W3).
 *
 * Item A's Redline door: focus ENTERING the document from outside it reads the
 * file again through the store's floored `rereadOnReturn`, and moving between
 * changes, the chip's buttons and the page does not (W4). The Phase 282.2
 * clean transition keeps calling the UNFLOORED `rereadRepo`, because that read
 * is owed and a floor must never drop it (W5).
 *
 * WHY SOURCE. This lane's environment is `node` with no DOM, so no test here
 * scrolls an element or moves focus between real elements; the behaviour is
 * the app run's (`probe:p334`, arms A3 and B1 to B5). What a later round would
 * drop is the WIRING, and that is read here the way `conformance:redline` rule
 * 40 reads it: comments blanked character for character (strings, template
 * substitutions and regular expressions tracked), every call, effect, handler
 * and block found by MATCHING BRACKETS, and each clause proved on ablations of
 * the shipping source made on STRINGS IN MEMORY, each of which must turn its
 * own clause red, and red for its own reason. Three plants that respell a
 * clause without breaking it must stay green, so the reader is shown reading
 * the gate rather than the bytes. The file is hashed before and after:
 * nothing here may write to the tree.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const VIEW_PATH = resolve(__dirname, '../RedlineDocument.tsx');
const SHIPPING = readFileSync(VIEW_PATH, 'utf8');
const SHIPPING_SHA = createHash('sha256').update(SHIPPING).digest('hex');

// ---------------------------------------------------------------------------
// The reader. Pure functions over text; nothing below touches the disk.
// ---------------------------------------------------------------------------

/**
 * Whether the slash at `at` opens a regular expression. The usual look-back
 * rule, with JSX's two slashes excluded: `</div>` and `<Tag />` are tags.
 */
function opensRegex(code: string, at: number): boolean {
  if (code[at + 1] === '>') return false;
  let i = at - 1;
  while (i >= 0 && /\s/.test(code[i] ?? '')) i -= 1;
  if (i < 0) return true;
  const c = code[i] ?? '';
  if (c === '<') return false;
  if ('(,=:[!&|?{};+-*%~^>'.includes(c)) return true;
  const word = /([A-Za-z_$][\w$]*)$/.exec(code.slice(Math.max(0, i - 12), i + 1));
  return word !== null && ['return', 'typeof', 'case', 'in', 'of', 'new'].includes(word[1] ?? '');
}

/**
 * The source with every comment blanked to spaces, character for character,
 * so an offset in the result is the same offset in the file. Strings are kept;
 * a template literal's `${…}` is read as code; a regular expression's body is
 * blanked so a quote inside one cannot open a string.
 */
export function blank(source: string): string {
  const out = source.split('');
  /** The brace depth at which each open `${` hands back to its template. */
  const resume: number[] = [];
  let depth = 0;
  let mode: 'code' | 'line' | 'block' | "'" | '"' | 'template' = 'code';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];
    if (mode === 'code') {
      if (c === '/' && d === '/') {
        mode = 'line';
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        continue;
      }
      if (c === '/' && d === '*') {
        mode = 'block';
        out[i] = ' ';
        out[i + 1] = ' ';
        i += 2;
        continue;
      }
      if (c === "'" || c === '"') mode = c;
      else if (c === '`') mode = 'template';
      else if (c === '{') depth += 1;
      else if (c === '}') {
        if (resume.length > 0 && resume[resume.length - 1] === depth) {
          resume.pop();
          mode = 'template';
        } else depth -= 1;
      } else if (c === '/' && opensRegex(source, i)) {
        let j = i + 1;
        let inClass = false;
        while (j < source.length && source[j] !== '\n') {
          const r = source[j];
          if (r === '\\') {
            j += 2;
            continue;
          }
          if (r === '[') inClass = true;
          else if (r === ']') inClass = false;
          else if (r === '/' && !inClass) break;
          j += 1;
        }
        for (let k = i + 1; k < j && k < source.length; k += 1) out[k] = ' ';
        i = j + 1;
        continue;
      }
      i += 1;
      continue;
    }
    if (mode === 'line') {
      if (c === '\n') mode = 'code';
      else out[i] = ' ';
      i += 1;
      continue;
    }
    if (mode === 'block') {
      if (c === '*' && d === '/') {
        out[i] = ' ';
        out[i + 1] = ' ';
        mode = 'code';
        i += 2;
        continue;
      }
      if (c !== '\n') out[i] = ' ';
      i += 1;
      continue;
    }
    if (mode === 'template') {
      if (c === '\\') {
        i += 2;
        continue;
      }
      if (c === '`') mode = 'code';
      else if (c === '$' && d === '{') {
        resume.push(depth);
        mode = 'code';
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    // A quoted string.
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === mode) mode = 'code';
    i += 1;
  }
  return out.join('');
}

const OPENERS: Record<string, string> = { '(': ')', '[': ']', '{': '}' };

/** The index of the bracket matching the one at `open`, quotes skipped; -1 when none. */
export function closeOf(code: string, open: number): number {
  const opener = code[open] ?? '';
  const closer = OPENERS[opener];
  if (closer === undefined) return -1;
  let depth = 0;
  let quote = '';
  for (let i = open; i < code.length; i += 1) {
    const c = code[i];
    if (quote !== '') {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === opener) depth += 1;
    else if (c === closer) {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/** The arguments of the call whose `(` is at `open`, split at depth-one commas. */
export function callArguments(code: string, open: number): string[] {
  const close = closeOf(code, open);
  if (close === -1) return [];
  const args: string[] = [];
  let depth = 0;
  let quote = '';
  let from = open + 1;
  for (let i = open + 1; i < close; i += 1) {
    const c = code[i];
    if (quote !== '') {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (c === ',' && depth === 0) {
      args.push(code.slice(from, i).trim());
      from = i + 1;
    }
  }
  const last = code.slice(from, close).trim();
  if (last !== '' || args.length > 0) args.push(last);
  return args;
}

/**
 * Where the statement starting at `from` ends: the `;` at depth zero, or the
 * `}` that closes the block it sits in, whichever comes first.
 */
function statementEnd(code: string, from: number): number {
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
    else if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return i;
      depth -= 1;
    } else if (c === ';' && depth === 0) return i;
  }
  return code.length;
}

const squash = (text: string): string => text.replace(/\s+/g, '');

/** Every offset at which `name(` is called in `code`, as a whole word. */
function callsOf(code: string, name: string): number[] {
  const out: number[] = [];
  const re = new RegExp(`\\b${name}\\s*\\(`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) out.push(m.index);
  return out;
}

/** The arguments of the call to `name` that starts at `at`. */
function argumentsAt(code: string, at: number): string[] {
  return callArguments(code, code.indexOf('(', at));
}

/**
 * Whether the code at `at` inside `body` runs only when an `if` lets it:
 * either it sits in the consequent of an `if (C)` for which `holds(C)`, or an
 * earlier `if (C) return;` for which `refuses(C)` stands in front of it. Both
 * are asked of the condition with its whitespace squashed.
 */
function gatedBy(
  body: string,
  at: number,
  holds: (cond: string) => boolean,
  refuses: (cond: string) => boolean
): boolean {
  const tests = /\bif\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = tests.exec(body)) !== null) {
    const open = m.index + m[0].length - 1;
    if (open > at) break;
    const close = closeOf(body, open);
    if (close === -1) continue;
    const cond = squash(body.slice(open + 1, close));
    let k = close + 1;
    while (/\s/.test(body[k] ?? '')) k += 1;
    const end = body[k] === '{' ? closeOf(body, k) : statementEnd(body, k);
    if (end === -1) continue;
    if (at > k && at < end && holds(cond)) return true;
    const consequent = squash(body.slice(k, end + 1));
    const returns = consequent === 'return;' || consequent === '{return;}';
    if (returns && at > end && refuses(cond)) return true;
  }
  return false;
}

/** `cond` is `want`, alone or joined to other clauses by `&&` only. */
const conjunctionHas = (cond: string, want: string): boolean =>
  !cond.includes('||') && cond.split('&&').includes(want);
/** `cond` is `want`, alone or joined to other clauses by `||` only. */
const disjunctionHas = (cond: string, want: string): boolean =>
  !cond.includes('&&') && cond.split('||').includes(want);

/** The opening tag of the one element whose `className` literal is `name`. */
function openingTag(code: string, name: string): { start: number; text: string } | string {
  const needle = `className="${name}"`;
  const at = code.indexOf(needle);
  if (at === -1) return `no element has className "${name}"`;
  if (code.indexOf(needle, at + 1) !== -1) return `two elements have className "${name}"`;
  let start = code.lastIndexOf('<', at);
  while (start > 0 && !/[A-Za-z]/.test(code[start + 1] ?? '')) start = code.lastIndexOf('<', start - 1);
  if (start <= 0) return `the element with className "${name}" has no opening tag`;
  let depth = 0;
  let quote = '';
  for (let i = start + 1; i < code.length; i += 1) {
    const c = code[i];
    if (quote !== '') {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '{') depth += 1;
    else if (c === '}') depth -= 1;
    else if (c === '>' && depth === 0) return { start, text: code.slice(start, i + 1) };
  }
  return `the opening tag of className "${name}" never closes`;
}

/** One `name={(p) => { … }}` attribute of a tag: its parameter and its body. */
function arrowAttribute(tag: string, name: string): { param: string; body: string } | string {
  const re = new RegExp(`\\b${name}=\\{`, 'g');
  const hits = [...tag.matchAll(re)];
  if (hits.length === 0) return `the scroller carries no ${name}`;
  if (hits.length > 1) return `the scroller carries ${String(hits.length)} ${name} attributes`;
  const brace = (hits[0]?.index ?? 0) + (hits[0]?.[0].length ?? 0) - 1;
  const close = closeOf(tag, brace);
  if (close === -1) return `the scroller's ${name} never closes`;
  const expr = tag.slice(brace + 1, close);
  const head = /^\s*\(?\s*([A-Za-z_$][\w$]*)\s*(?::[^)=]*)?\)?\s*=>\s*\{/.exec(expr);
  if (head === null) return `the scroller's ${name} is not an arrow with a block body`;
  const open = (head.index ?? 0) + head[0].length - 1;
  const end = closeOf(expr, open);
  if (end === -1) return `the scroller's ${name} body never closes`;
  return { param: head[1] ?? '', body: expr.slice(open, end + 1) };
}

interface Effect {
  hook: 'useEffect' | 'useLayoutEffect';
  callback: string;
  deps: string | null;
}

/** Every `useEffect(` and `useLayoutEffect(` call, read by matching parentheses. */
function effectsOf(code: string): Effect[] {
  const out: Effect[] = [];
  const re = /\b(useEffect|useLayoutEffect)\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    const args = callArguments(code, m.index + m[0].length - 1);
    if (args.length === 0) continue;
    out.push({
      hook: m[1] as Effect['hook'],
      callback: args[0] ?? '',
      deps: args.length > 1 ? (args[args.length - 1] ?? null) : null
    });
  }
  return out;
}

/** The items of a dependency array, squashed, or null when it is not a literal array. */
function depItems(deps: string | null): string[] | null {
  if (deps === null) return null;
  const s = deps.trim();
  if (!s.startsWith('[') || closeOf(s, 0) !== s.length - 1) return null;
  const inner = s.slice(1, -1).trim();
  return inner === '' ? [] : inner.split(',').map(squash);
}

/**
 * Every function an effect's callback RETURNS, as text: a function written
 * after `return`, or the declaration of a name returned bare.
 */
function returnedFunctions(callback: string): string[] {
  const out: string[] = [];
  const re = /\breturn\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(callback)) !== null) {
    const from = m.index + m[0].length;
    const returned = callback.slice(from, statementEnd(callback, from)).trim();
    if (returned === '') continue;
    const bare = /^[A-Za-z_$][\w$]*$/.exec(returned);
    if (bare !== null) {
      const decl = new RegExp(`\\b(?:const|let|var|function)\\s+${bare[0]}\\b`).exec(callback);
      if (decl !== null) {
        const declFrom = decl.index;
        out.push(callback.slice(declFrom, statementEnd(callback, declFrom + decl[0].length)));
      }
      continue;
    }
    if (/^(?:async\s+)?(?:function\b|\(|[A-Za-z_$][\w$]*\s*=>)/.test(returned) && /=>|\bfunction\b/.test(returned)) {
      out.push(returned);
    }
  }
  return out;
}

const SCROLLER = 'ed-redline-scroll';

export interface Wiring {
  W1: string[];
  W2: string[];
  W3: string[];
  W4: string[];
  W5: string[];
}

/** Every clause's problems over one copy of the view's source; empty is green. */
export function readWiring(source: string): Wiring {
  const code = blank(source);
  const w: Wiring = { W1: [], W2: [], W3: [], W4: [], W5: [] };
  const tag = openingTag(code, SCROLLER);
  const effects = effectsOf(code);

  // W1. The scroller's onScroll saves under THIS render's tab, from the
  // scroller itself, and only while the document is drawn.
  const scroll = typeof tag === 'string' ? tag : arrowAttribute(tag.text, 'onScroll');
  if (typeof scroll === 'string') w.W1.push(scroll);
  else {
    const saves = callsOf(scroll.body, 'rememberRedlineScroll');
    if (saves.length !== 1) {
      w.W1.push(`the scroller's onScroll calls rememberRedlineScroll ${String(saves.length)} times, not once`);
    } else {
      const at = saves[0] ?? 0;
      const args = argumentsAt(scroll.body, at).map(squash);
      if (args[0] !== 'tab.id') {
        w.W1.push(`the save is keyed by ${args[0] ?? 'nothing'}, not by this render's tab.id`);
      }
      if (args[1] !== `${scroll.param}.currentTarget.scrollTop`) {
        w.W1.push(`the save stores ${args[1] ?? 'nothing'}, not the scroller's own ${scroll.param}.currentTarget.scrollTop`);
      }
      const guarded = gatedBy(
        scroll.body,
        at,
        (cond) => conjunctionHas(cond, 'doc!==null'),
        (cond) => disjunctionHas(cond, 'doc===null')
      );
      if (!guarded) {
        w.W1.push('the save is not under doc !== null, so the skeleton clamping the shared scroller to 0 overwrites the arriving tab\'s place');
      }
    }
  }

  // W2. No effect cleanup saves, and the scroller's onScroll is the only save.
  for (const effect of effects) {
    for (const fn of returnedFunctions(effect.callback)) {
      if (/\brememberRedlineScroll\b/.test(fn)) {
        w.W2.push(`a function returned from a ${effect.hook} (deps ${effect.deps === null ? 'none' : squash(effect.deps)}) saves the place, and a cleanup reads the next tab's scroller`);
      }
    }
  }
  const allSaves = callsOf(code, 'rememberRedlineScroll').length;
  if (allSaves !== 1) {
    w.W2.push(`the view calls rememberRedlineScroll ${String(allSaves)} times; the scroller's onScroll must be the only save`);
  }

  // W3. One layout effect restores, keyed on [tab.id, ready] alone.
  const restoring = effects.filter((e) => /\bredlineScrollOf\s*\(\s*tab\.id\s*\)/.test(e.callback));
  const layout = restoring.filter((e) => e.hook === 'useLayoutEffect');
  if (restoring.length !== 1 || layout.length !== 1) {
    w.W3.push(`${String(layout.length)} useLayoutEffect and ${String(restoring.length - layout.length)} useEffect name redlineScrollOf(tab.id); exactly one useLayoutEffect must`);
  } else {
    const effect = layout[0] as Effect;
    const callback = squash(effect.callback);
    if (!callback.includes('.scrollTop=redlineScrollOf(tab.id)??0')) {
      w.W3.push('the restore does not assign scrollTop = redlineScrollOf(tab.id) ?? 0, so a tab with no remembered place keeps the departing tab\'s offset');
    }
    const items = depItems(effect.deps);
    const exact = items !== null && items.length === 2 && items.includes('tab.id') && items.includes('ready');
    if (!exact) {
      w.W3.push(`the restore's dependencies are ${effect.deps === null ? 'none' : squash(effect.deps)}, not exactly [tab.id, ready]; anything else re-restores on a recompose and moves the reader`);
    }
    const at = effect.callback.search(/\.scrollTop\s*=/);
    const waits =
      at !== -1 &&
      gatedBy(
        effect.callback,
        at,
        (cond) => conjunctionHas(cond, 'ready'),
        (cond) => disjunctionHas(cond, '!ready')
      );
    if (!waits) w.W3.push('the restore does not wait for ready, so it sets the place on the skeleton');
  }
  const readies = [...code.matchAll(/\bconst\s+ready\s*=\s*([^;]+);/g)];
  if (readies.length !== 1 || squash(readies[0]?.[1] ?? '') !== 'doc!==null') {
    w.W3.push(`ready is ${readies.length === 1 ? squash(readies[0]?.[1] ?? '') : `declared ${String(readies.length)} times`}, not doc !== null`);
  }

  // W4. The focus door: after makeCurrent, only on focus entering from outside.
  const focus = typeof tag === 'string' ? tag : arrowAttribute(tag.text, 'onFocus');
  if (typeof focus === 'string') w.W4.push(focus);
  else {
    const doors = callsOf(focus.body, 'rereadOnReturn');
    if (doors.length !== 1) {
      w.W4.push(`the scroller's onFocus calls rereadOnReturn ${String(doors.length)} times, not once`);
    } else {
      const at = doors[0] ?? 0;
      const args = argumentsAt(focus.body, at).map(squash);
      if (args.length !== 1 || args[0] !== 'tab.id') {
        w.W4.push(`the door reads ${args.join(', ')}, not tab.id`);
      }
      const want = `focusEntersFrom(${focus.param}.currentTarget,${focus.param}.relatedTarget)`;
      const entering = gatedBy(
        focus.body,
        at,
        (cond) => conjunctionHas(cond, want),
        (cond) => disjunctionHas(cond, `!${want}`)
      );
      if (!entering) {
        w.W4.push(`the door is not under ${want}, so moving between changes inside the document reads the repository`);
      }
      const current = callsOf(focus.body, 'makeCurrent');
      if (current.length === 0 || (current[0] ?? 0) > at) {
        w.W4.push('the door is not after makeCurrent');
      }
    }
  }
  const allDoors = callsOf(code, 'rereadOnReturn').length;
  if (allDoors !== 1) {
    w.W4.push(`the view calls rereadOnReturn ${String(allDoors)} times; the focus door must be the only one`);
  }

  // W5. Phase 282.2's clean transition still takes the unfloored read.
  const clean = effects.filter((e) => {
    const items = depItems(e.deps);
    return items !== null && items.length === 1 && items[0] === 'tab.dirty';
  });
  if (clean.length !== 1) {
    w.W5.push(`${String(clean.length)} effects depend on exactly [tab.dirty]; Phase 282.2's clean transition must be one`);
  } else {
    const body = clean[0]?.callback ?? '';
    if (!squash(body).includes('.rereadRepo(tab.repoPath)')) {
      w.W5.push('the clean transition no longer calls rereadRepo(tab.repoPath), the read it owes');
    }
    if (/\brereadOnReturn\b/.test(body)) {
      w.W5.push('the clean transition names rereadOnReturn, whose floor can drop the read it owes');
    }
  }
  return w;
}

// ---------------------------------------------------------------------------
// The ablations: every one a string edit of the SHIPPING source, never a write.
// ---------------------------------------------------------------------------

type Clause = keyof Wiring;

interface Ablation {
  clause: Clause;
  name: string;
  /** What the owning clause must say, so it is red for THIS reason and not by accident. */
  because: RegExp;
  mutate: (source: string) => string;
}

/** Replace exactly one match of `pattern`, or throw: an ablation that edits nothing proves nothing. */
function once(source: string, pattern: RegExp | string, replacement: string): string {
  const re = typeof pattern === 'string' ? new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') : new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
  const hits = source.match(re)?.length ?? 0;
  if (hits !== 1) throw new Error(`ablation anchor ${String(pattern)} matched ${String(hits)} times, not once`);
  return source.replace(new RegExp(re.source, re.flags.replace('g', '')), replacement);
}

const SAVE_BLOCK = /if \(doc !== null\) \{\s*(rememberRedlineScroll\(tab\.id, event\.currentTarget\.scrollTop\);)\s*\}/;
const DOOR_BLOCK = /if \(focusEntersFrom\(event\.currentTarget, event\.relatedTarget\)\) \{\s*(useEditor\.getState\(\)\.rereadOnReturn\(tab\.id\);)\s*\}/;
const RESTORE_DEPS = /\}, \[tab\.id, ready\]\);/;
const CLEANUP_EFFECT = `
  useEffect(() => {
    const el = hostRef.current;
    return () => {
      if (el !== null) rememberRedlineScroll(tab.id, el.scrollTop);
    };
  }, [tab.id]);
`;

const ABLATIONS: Ablation[] = [
  // W1
  { clause: 'W1', name: 'the doc !== null guard removed', because: /not under doc !== null/, mutate: (s) => once(s, SAVE_BLOCK, '$1') },
  { clause: 'W1', name: 'the guard inverted to doc === null', because: /not under doc !== null/, mutate: (s) => once(s, 'if (doc !== null) {\n            rememberRedlineScroll', 'if (doc === null) {\n            rememberRedlineScroll') },
  { clause: 'W1', name: 'the key changed to tab.name', because: /keyed by tab\.name/, mutate: (s) => once(s, 'rememberRedlineScroll(tab.id,', 'rememberRedlineScroll(tab.name,') },
  { clause: 'W1', name: 'the key changed to the store\'s active id', because: /keyed by useEditor/, mutate: (s) => once(s, 'rememberRedlineScroll(tab.id,', "rememberRedlineScroll(useEditor.getState().activeId ?? '',") },
  { clause: 'W1', name: 'the offset read from the shared ref instead of the event', because: /not the scroller's own event\.currentTarget\.scrollTop/, mutate: (s) => once(s, 'event.currentTarget.scrollTop)', 'hostRef.current?.scrollTop ?? 0)') },
  { clause: 'W1', name: 'onScroll taken off the scroller', because: /carries no onScroll/, mutate: (s) => once(s, /\n\s*onScroll=\{\(event\) => \{[\s\S]*?\n {8}\}\}/, '') },
  // W2
  {
    clause: 'W2',
    name: 'the save moved into a [tab.id] cleanup', because: /returned from a useEffect \(deps \[tab\.id\]\)/,
    mutate: (s) => once(once(s, /\n\s*onScroll=\{\(event\) => \{[\s\S]*?\n {8}\}\}/, ''), RESTORE_DEPS, `}, [tab.id, ready]);${CLEANUP_EFFECT}`)
  },
  { clause: 'W2', name: 'a [tab.id] cleanup that saves, beside the onScroll', because: /returned from a useEffect \(deps \[tab\.id\]\)/, mutate: (s) => once(s, RESTORE_DEPS, `}, [tab.id, ready]);${CLEANUP_EFFECT}`) },
  {
    clause: 'W2',
    name: 'a cleanup returned by name', because: /returned from a useLayoutEffect \(deps \[tab\.id\]\)/,
    mutate: (s) =>
      once(
        s,
        RESTORE_DEPS,
        `}, [tab.id, ready]);
  useLayoutEffect(() => {
    const el = hostRef.current;
    const keep = (): void => {
      if (el !== null) rememberRedlineScroll(tab.id, el.scrollTop);
    };
    return keep;
  }, [tab.id]);
`
      )
  },
  // W3
  { clause: 'W3', name: 'composed added to the restore\'s deps', because: /\[tab\.id,ready,composed\], not exactly/, mutate: (s) => once(s, RESTORE_DEPS, '}, [tab.id, ready, composed]);') },
  { clause: 'W3', name: 'the restore keyed on tab.id alone', because: /are \[tab\.id\], not exactly/, mutate: (s) => once(s, RESTORE_DEPS, '}, [tab.id]);') },
  { clause: 'W3', name: 'the ?? 0 removed', because: /does not assign scrollTop/, mutate: (s) => once(s, 'redlineScrollOf(tab.id) ?? 0', 'redlineScrollOf(tab.id) as number') },
  {
    clause: 'W3',
    name: 'useEffect substituted for the useLayoutEffect', because: /0 useLayoutEffect and 1 useEffect/,
    mutate: (s) => once(s, /useLayoutEffect\(\(\) => \{\n(\s*)const el = hostRef\.current;\n\s*if \(el === null \|\| !ready\) return;/, 'useEffect(() => {\n$1const el = hostRef.current;\n$1if (el === null || !ready) return;')
  },
  { clause: 'W3', name: 'the readiness guard removed', because: /does not wait for ready/, mutate: (s) => once(s, 'if (el === null || !ready) return;', 'if (el === null) return;') },
  { clause: 'W3', name: 'ready no longer doc !== null', because: /ready is composed!==undefined/, mutate: (s) => once(s, 'const ready = doc !== null;', 'const ready = composed !== undefined;') },
  { clause: 'W3', name: 'a second restore in a layout effect keyed on the picture', because: /2 useLayoutEffect and 0 useEffect/, mutate: (s) => once(s, RESTORE_DEPS, `}, [tab.id, ready]);
  useLayoutEffect(() => {
    if (hostRef.current !== null) hostRef.current.scrollTop = redlineScrollOf(tab.id) ?? 0;
  }, [composed]);
`) },
  // W4
  { clause: 'W4', name: 'the focusEntersFrom guard removed', because: /not under focusEntersFrom/, mutate: (s) => once(s, DOOR_BLOCK, '$1') },
  { clause: 'W4', name: 'event.target substituted for currentTarget', because: /not under focusEntersFrom/, mutate: (s) => once(s, 'focusEntersFrom(event.currentTarget,', 'focusEntersFrom(event.target as HTMLElement,') },
  { clause: 'W4', name: 'relatedTarget replaced by target', because: /not under focusEntersFrom/, mutate: (s) => once(s, 'event.relatedTarget)) {', 'event.target)) {') },
  { clause: 'W4', name: 'the guard negated', because: /not under focusEntersFrom/, mutate: (s) => once(s, 'if (focusEntersFrom(', 'if (!focusEntersFrom(') },
  { clause: 'W4', name: 'the door keyed by the repository', because: /reads tab\.repoPath, not tab\.id/, mutate: (s) => once(s, 'rereadOnReturn(tab.id)', 'rereadOnReturn(tab.repoPath)') },
  {
    clause: 'W4',
    name: 'the door moved before makeCurrent', because: /not after makeCurrent/,
    mutate: (s) => {
      const lifted = once(s, DOOR_BLOCK, '');
      return once(lifted, 'onFocus={(event) => {\n', 'onFocus={(event) => {\n          if (focusEntersFrom(event.currentTarget, event.relatedTarget)) {\n            useEditor.getState().rereadOnReturn(tab.id);\n          }\n');
    }
  },
  { clause: 'W4', name: 'a second door in a [tab.id] effect', because: /calls rereadOnReturn 2 times/, mutate: (s) => once(s, RESTORE_DEPS, '}, [tab.id, ready]);\n  useEffect(() => {\n    useEditor.getState().rereadOnReturn(tab.id);\n  }, [tab.id]);\n') },
  // W5
  { clause: 'W5', name: 'rereadRepo swapped for rereadOnReturn in the clean transition', because: /names rereadOnReturn, whose floor/, mutate: (s) => once(s, 'useEditor.getState().rereadRepo(tab.repoPath);', 'useEditor.getState().rereadOnReturn(tab.id);') },
  { clause: 'W5', name: 'the clean transition\'s read removed', because: /no longer calls rereadRepo/, mutate: (s) => once(s, 'useEditor.getState().rereadRepo(tab.repoPath);', '') },
  { clause: 'W5', name: 'the clean transition re-keyed on [tab.dirty, tab.id]', because: /0 effects depend on exactly \[tab\.dirty\]/, mutate: (s) => once(s, '}, [tab.dirty]);', '}, [tab.dirty, tab.id]);') }
];

/** Respellings that keep every clause; each must stay green. */
const PLANTS: { name: string; mutate: (source: string) => string }[] = [
  {
    name: 'the save behind an early return instead of a block',
    mutate: (s) => once(s, SAVE_BLOCK, 'if (doc === null) return;\n          $1')
  },
  {
    name: 'the door behind a conjunction',
    mutate: (s) => once(s, 'if (focusEntersFrom(event.currentTarget, event.relatedTarget)) {', 'if (focusEntersFrom(event.currentTarget, event.relatedTarget) && tab.id !== \'\') {')
  },
  {
    name: 'the restore\'s dependencies in the other order',
    mutate: (s) => once(s, RESTORE_DEPS, '}, [ready, tab.id]);')
  }
];

// ---------------------------------------------------------------------------

describe('Phase 334: the Redline view\'s wiring (build/p334/SPEC.md §5 W1 to W5)', () => {
  afterAll(() => {
    // Nothing above may write to the tree.
    const after = createHash('sha256').update(readFileSync(VIEW_PATH, 'utf8')).digest('hex');
    expect(after).toBe(SHIPPING_SHA);
  });

  it('the reader blanks comments character for character and keeps code', () => {
    const code = blank(SHIPPING);
    expect(code.length).toBe(SHIPPING.length);
    expect(code.split('\n').length).toBe(SHIPPING.split('\n').length);
    // The phase's own comments name the calls they describe; blanked, they are gone.
    expect(code).not.toMatch(/PHASE 334/);
    expect(code).toContain('className="ed-redline-scroll"');
    // A template substitution is code: the scroller's aria-label survives whole.
    expect(blank('const a = `${x} // y`; // z')).toBe('const a = `${x} // y`;     ');
    expect(blank("const r = /'/; const s = 'k'; // c")).toBe("const r = / /; const s = 'k';     ");
  });

  it('the shipping view holds every clause', () => {
    expect(readWiring(SHIPPING)).toEqual({ W1: [], W2: [], W3: [], W4: [], W5: [] });
  });

  for (const clause of ['W1', 'W2', 'W3', 'W4', 'W5'] as const) {
    describe(`${clause}`, () => {
      for (const ablation of ABLATIONS.filter((a) => a.clause === clause)) {
        it(`goes red when ${ablation.name}`, () => {
          const ablated = ablation.mutate(SHIPPING);
          expect(ablated).not.toBe(SHIPPING);
          const problems = readWiring(ablated)[clause];
          expect(problems.length).toBeGreaterThan(0);
          expect(problems.join(' | ')).toMatch(ablation.because);
        });
      }
    });
  }

  it('every clause has at least one ablation that turns it red', () => {
    const owned = new Set(ABLATIONS.map((a) => a.clause));
    expect([...owned].sort()).toEqual(['W1', 'W2', 'W3', 'W4', 'W5']);
  });

  for (const plant of PLANTS) {
    it(`stays green when ${plant.name}`, () => {
      const planted = plant.mutate(SHIPPING);
      expect(planted).not.toBe(SHIPPING);
      expect(readWiring(planted)).toEqual({ W1: [], W2: [], W3: [], W4: [], W5: [] });
    });
  }
});
