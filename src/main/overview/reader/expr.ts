/**
 * The evaluator for keep-map.json. It knows nothing about any provider.
 * Everything provider specific is a value in the map, never a branch here.
 * Ported from docs/research/assets/63-keep-map/lib/expr.js with three
 * changes the Phase 137 spec names. `extract`'s `take` accepts a dotted
 * path. A drop rule can carry `marks`, `marksIfNoAnswer` and `noticeFrom`,
 * so `slot` reports WHICH rule dropped a record instead of only that one
 * did. And a `stripLines` transform exists for cursoride's image lines.
 */

import type {
  DropRule,
  MapPredicate,
  SlotCfg,
  TextSpec,
  TimeSpec,
  TransformOp
} from './map-types';

/** A parsed record. The shape is the provider's, so every field is unknown. */
export type Rec = Record<string, unknown>;

/** Read a dotted path off an object. */
export function at(obj: unknown, path: string | null | undefined): unknown {
  if (obj == null || path == null) return undefined;
  const o = obj as Rec;
  if (path.indexOf('.') === -1) return o[path];
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Rec)[key];
  }
  return cur;
}

export function isBlank(v: unknown): boolean {
  return v == null || (typeof v === 'string' && v.trim() === '');
}

/** The `$sessionId` style bindings a filter can name. */
export type Bind = Record<string, unknown> | null;

function resolveValue(v: unknown, ctx: Rec): unknown {
  if (typeof v === 'string' && v.startsWith('$')) {
    const bind = ctx['$bind'] as Record<string, unknown> | undefined;
    return bind ? bind[v.slice(1)] : undefined;
  }
  return v;
}

/** Evaluate one predicate over a record. */
export function test(pred: MapPredicate | null | undefined, ctx: unknown): boolean {
  if (pred == null) return true;
  const keys = Object.keys(pred);
  const op = keys[0];
  if (op === undefined) return true;
  const a = pred[op] as never;
  const c = ctx as Rec;
  switch (op) {
    case 'and':
      return (a as MapPredicate[]).every((p) => test(p, ctx));
    case 'or':
      return (a as MapPredicate[]).some((p) => test(p, ctx));
    case 'not':
      return !test(a as MapPredicate, ctx);
    case 'eq': {
      const [path, v] = a as [string, unknown];
      return at(ctx, path) === resolveValue(v, c);
    }
    case 'ne': {
      const [path, v] = a as [string, unknown];
      return at(ctx, path) !== resolveValue(v, c);
    }
    case 'exists': {
      const v = at(ctx, a as string);
      return v !== undefined && v !== null;
    }
    case 'notExists': {
      const v = at(ctx, a as string);
      return v === undefined || v === null;
    }
    case 'blank':
      return isBlank(at(ctx, a as string));
    case 'isArray':
      return Array.isArray(at(ctx, a as string));
    case 'isString':
      return typeof at(ctx, a as string) === 'string';
    case 'startsWith': {
      const [path, prefix] = a as [string, string];
      const v = at(ctx, path);
      return typeof v === 'string' && v.startsWith(prefix);
    }
    case 'startsWithAny': {
      const [path, prefixes] = a as [string, string[]];
      const v = at(ctx, path);
      return typeof v === 'string' && prefixes.some((p) => v.startsWith(p));
    }
    case 'contains': {
      const [path, needle] = a as [string, string];
      const v = at(ctx, path);
      return typeof v === 'string' && v.includes(needle);
    }
    case 'hasPartOfType': {
      const [path, type] = a as [string, string];
      const arr = at(ctx, path);
      return (
        Array.isArray(arr) &&
        arr.some((p) => p != null && typeof p === 'object' && (p as Rec)['type'] === type)
      );
    }
    default:
      throw new Error('keep-map: unknown predicate ' + op);
  }
}

/** Pull a slot's raw text out of a record. */
export function extract(spec: TextSpec | undefined, rec: unknown): string {
  if (!spec) return '';
  if (spec.firstOf) {
    for (const s of spec.firstOf) {
      const t = extract(s, rec);
      if (t) return t;
    }
    return '';
  }
  if (spec.field) {
    const v = at(rec, spec.field);
    return typeof v === 'string' ? v : '';
  }
  const path = spec.parts ?? spec.stringOrParts;
  const v = at(rec, path);
  if (typeof v === 'string') return spec.stringOrParts ? v : '';
  if (!Array.isArray(v)) return '';
  const out: string[] = [];
  for (const part of v) {
    if (part == null || typeof part !== 'object') continue;
    if (spec.partWhen && !test(spec.partWhen, part)) continue;
    if (spec.dropPartWhen && test(spec.dropPartWhen, part)) continue;
    // The take path is dotted, so qwen's functionCall.args.command works.
    const t = at(part, spec.take ?? 'text');
    if (typeof t === 'string' && t !== '') out.push(t);
  }
  return out.join(spec.join === undefined ? '\n' : spec.join);
}

/** Apply the map's text transforms in order. */
export function transform(ops: TransformOp[] | undefined, text: string): string {
  let t = text;
  for (const op of ops ?? []) {
    switch (op.op) {
      case 'between': {
        const open = op.open ?? '';
        const close = op.close ?? '';
        const i = t.indexOf(open);
        if (i === -1) {
          if (!op.keepWholeIfMissing) t = '';
          break;
        }
        const j = t.indexOf(close, i + open.length);
        t = j === -1 ? t.slice(i + open.length) : t.slice(i + open.length, j);
        break;
      }
      case 'cutAt': {
        const i = t.indexOf(op.marker ?? '');
        if (i !== -1) t = t.slice(0, i);
        break;
      }
      case 'afterMarker': {
        // Defect 5. The codex unwrap fires on the PRESENCE of the marker.
        // A rule gated on one wrapper heading leaked the other wrapper.
        if (op.onlyIfStartsWith && !op.onlyIfStartsWith.some((p) => t.startsWith(p))) break;
        const marker = op.marker ?? '';
        const i = t.indexOf(marker);
        if (i !== -1) t = t.slice(i + marker.length);
        break;
      }
      case 'afterLast': {
        const marker = op.marker ?? '';
        const i = t.lastIndexOf(marker);
        if (i === -1) break;
        const tail = t.slice(i + marker.length).replace(/^[\s-]+/, '');
        t =
          op.minLength && tail.length < op.minLength
            ? t.split(/<tool-use>[\s\S]*?<\/tool-use>/).join('')
            : tail;
        break;
      }
      case 'stripPrefix':
        for (const p of op.prefixes ?? []) if (t.startsWith(p)) t = t.slice(p.length);
        break;
      case 'stripSuffix':
        for (const s of op.suffixes ?? []) if (t.endsWith(s)) t = t.slice(0, -s.length);
        break;
      case 'stripLines': {
        // cursoride writes `[Image: source: <absolute path>]` lines into the
        // person's own record. The line goes, the ask stays.
        const prefixes = op.prefixes ?? [];
        t = t
          .split('\n')
          .filter((line) => !prefixes.some((p) => line.trimStart().startsWith(p)))
          .join('\n');
        break;
      }
      case 'commandEcho': {
        const name = tagged(t, op.nameTag ?? '');
        if (name === null) break;
        const args = tagged(t, op.argsTag ?? '') ?? '';
        t =
          (op.dropCommands ?? []).includes(name.trim()) || args.trim() === ''
            ? ''
            : (name.trim() + ' ' + args.trim()).trim();
        break;
      }
      default:
        throw new Error('keep-map: unknown transform ' + (op as TransformOp).op);
    }
  }
  return t.trim();
}

function tagged(text: string, tag: string): string | null {
  const open = '<' + tag + '>';
  const close = '</' + tag + '>';
  const i = text.indexOf(open);
  if (i === -1) return null;
  const j = text.indexOf(close, i + open.length);
  if (j === -1) return null;
  return text.slice(i + open.length, j);
}

/** Read a slot's clock. */
export function stamp(spec: TimeSpec | null | undefined, rec: unknown, rawText: string): string | null {
  if (!spec) return null;
  if (spec.format === 'cursor-timestamp-tag') {
    const m = /<timestamp>([^<]+)<\/timestamp>/.exec(rawText || '');
    return m?.[1] ?? null;
  }
  const v = at(rec, spec.path);
  if (v == null) return null;
  switch (spec.format) {
    case 'iso':
      return typeof v === 'string' ? v : null;
    case 'epoch-ms':
      return new Date(Number(v)).toISOString();
    case 'epoch-us':
      return new Date(Number(v) / 1000).toISOString();
    default:
      return String(v);
  }
}

export interface SlotKept {
  kind: 'kept';
  text: string;
  at: string | null;
}

export interface SlotDropped {
  kind: 'dropped';
  rule: DropRule;
  text: string;
}

/** null means the slot's `when` did not match at all. */
export type SlotResult = SlotKept | SlotDropped | null;

export interface SlotStats {
  dropped: Record<string, number>;
  records: number;
  asksKept: number;
  /** Close marker records seen, for the codex no-marker vintage detection. */
  closesSeen: number;
}

export function newStats(): SlotStats {
  return {
    dropped: Object.create(null) as Record<string, number>,
    records: 0,
    asksKept: 0,
    closesSeen: 0
  };
}

/**
 * One record against one slot. Returns the kept text, or the drop rule that
 * fired, so the fold can honour `marks` and `noticeFrom`.
 */
export function slot(
  cfg: SlotCfg | undefined,
  rec: unknown,
  bind: Bind,
  stats: SlotStats | null
): SlotResult {
  if (!cfg || !test(cfg.when, withBind(rec, bind))) return null;
  const raw = extract(cfg.text, rec);
  const text = transform(cfg.transform, raw);
  const ctx = withBind(rec, bind) as Rec;
  ctx['_text'] = text;
  ctx['_raw'] = raw;
  for (const rule of cfg.drop ?? []) {
    if (test(rule.when, ctx)) {
      if (stats) stats.dropped[rule.reason] = (stats.dropped[rule.reason] ?? 0) + 1;
      return { kind: 'dropped', rule, text };
    }
  }
  return { kind: 'kept', text, at: stamp(cfg.time, rec, raw) };
}

/**
 * Layer the bindings over the record without copying it. `at` reads through
 * the prototype chain, so a prototype layer is enough.
 */
export function withBind(rec: unknown, bind: Bind): unknown {
  if (rec != null && typeof rec === 'object' && !Array.isArray(rec)) {
    const o = Object.create(rec as object) as Rec;
    if (bind) o['$bind'] = bind;
    return o;
  }
  return rec;
}
