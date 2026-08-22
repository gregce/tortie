'use strict';
// Research 63. The evaluator for keep-map.json. It knows nothing about any provider.
// Everything provider specific is a value in the map, never a branch in this file.

function at(obj, path) {
  if (obj == null || path == null) return undefined;
  if (path.indexOf('.') === -1) return obj[path];
  let cur = obj;
  for (const key of path.split('.')) {
    if (cur == null) return undefined;
    cur = cur[key];
  }
  return cur;
}

function isBlank(v) { return v == null || (typeof v === 'string' && v.trim() === ''); }

// ---- predicates -------------------------------------------------------------
function test(pred, ctx) {
  if (pred == null) return true;
  const op = Object.keys(pred)[0];
  const a = pred[op];
  switch (op) {
    case 'and': return a.every((p) => test(p, ctx));
    case 'or': return a.some((p) => test(p, ctx));
    case 'not': return !test(a, ctx);
    case 'eq': return at(ctx, a[0]) === resolve(a[1], ctx);
    case 'ne': return at(ctx, a[0]) !== resolve(a[1], ctx);
    case 'exists': { const v = at(ctx, a); return v !== undefined && v !== null; }
    case 'notExists': { const v = at(ctx, a); return v === undefined || v === null; }
    case 'blank': return isBlank(at(ctx, a));
    case 'isArray': return Array.isArray(at(ctx, a));
    case 'isString': return typeof at(ctx, a) === 'string';
    case 'startsWith': { const v = at(ctx, a[0]); return typeof v === 'string' && v.startsWith(a[1]); }
    case 'startsWithAny': { const v = at(ctx, a[0]); return typeof v === 'string' && a[1].some((p) => v.startsWith(p)); }
    case 'contains': { const v = at(ctx, a[0]); return typeof v === 'string' && v.includes(a[1]); }
    case 'hasPartOfType': { const arr = at(ctx, a[0]); return Array.isArray(arr) && arr.some((p) => p && p.type === a[1]); }
    default: throw new Error('keep-map: unknown predicate ' + op);
  }
}

function resolve(v, ctx) {
  if (typeof v === 'string' && v.startsWith('$')) return ctx.$bind ? ctx.$bind[v.slice(1)] : undefined;
  return v;
}

// ---- text extraction --------------------------------------------------------
function extract(spec, rec) {
  if (!spec) return '';
  if (spec.firstOf) {
    for (const s of spec.firstOf) { const t = extract(s, rec); if (t) return t; }
    return '';
  }
  if (spec.field) { const v = at(rec, spec.field); return typeof v === 'string' ? v : ''; }
  const path = spec.parts || spec.stringOrParts;
  const v = at(rec, path);
  if (typeof v === 'string') return spec.stringOrParts ? v : '';
  if (!Array.isArray(v)) return '';
  const out = [];
  for (const part of v) {
    if (!part || typeof part !== 'object') continue;
    if (spec.partWhen && !test(spec.partWhen, part)) continue;
    if (spec.dropPartWhen && test(spec.dropPartWhen, part)) continue;
    const t = part[spec.take || 'text'];
    if (typeof t === 'string' && t !== '') out.push(t);
  }
  return out.join(spec.join === undefined ? '\n' : spec.join);
}

// ---- text transforms --------------------------------------------------------
function transform(ops, text, rec) {
  let t = text;
  for (const op of ops || []) {
    switch (op.op) {
      case 'between': {
        const i = t.indexOf(op.open);
        if (i === -1) { if (!op.keepWholeIfMissing) t = ''; break; }
        const j = t.indexOf(op.close, i + op.open.length);
        t = j === -1 ? t.slice(i + op.open.length) : t.slice(i + op.open.length, j);
        break;
      }
      case 'cutAt': { const i = t.indexOf(op.marker); if (i !== -1) t = t.slice(0, i); break; }
      case 'afterMarker': {
        if (op.onlyIfStartsWith && !op.onlyIfStartsWith.some((p) => t.startsWith(p))) break;
        const i = t.indexOf(op.marker);
        if (i !== -1) t = t.slice(i + op.marker.length);
        break;
      }
      case 'afterLast': {
        const i = t.lastIndexOf(op.marker);
        if (i === -1) break;
        const tail = t.slice(i + op.marker.length).replace(/^[\s-]+/, '');
        t = (op.minLength && tail.length < op.minLength) ? t.split(/<tool-use>[\s\S]*?<\/tool-use>/).join('') : tail;
        break;
      }
      case 'stripPrefix': for (const p of op.prefixes) if (t.startsWith(p)) t = t.slice(p.length); break;
      case 'stripSuffix': for (const s of op.suffixes) if (t.endsWith(s)) t = t.slice(0, -s.length); break;
      case 'commandEcho': {
        const name = tagged(t, op.nameTag);
        if (name === null) break;
        const args = tagged(t, op.argsTag) || '';
        t = (op.dropCommands || []).includes(name.trim()) || args.trim() === '' ? '' : (name.trim() + ' ' + args.trim()).trim();
        break;
      }
      default: throw new Error('keep-map: unknown transform ' + op.op);
    }
  }
  return t.trim();
}

function tagged(text, tag) {
  const open = '<' + tag + '>', close = '</' + tag + '>';
  const i = text.indexOf(open); if (i === -1) return null;
  const j = text.indexOf(close, i + open.length); if (j === -1) return null;
  return text.slice(i + open.length, j);
}

// ---- timestamps -------------------------------------------------------------
function stamp(spec, rec, text) {
  if (!spec) return null;
  if (spec.format === 'cursor-timestamp-tag') {
    const m = /<timestamp>([^<]+)<\/timestamp>/.exec(text || '');
    return m ? m[1] : null;
  }
  const v = at(rec, spec.path);
  if (v == null) return null;
  switch (spec.format) {
    case 'iso': return typeof v === 'string' ? v : null;
    case 'epoch-ms': return new Date(Number(v)).toISOString();
    case 'epoch-us': return new Date(Number(v) / 1000).toISOString();
    default: return String(v);
  }
}

// ---- one record to an ask or an answer --------------------------------------
// Returns {text, at} or null, and records the drop reason when it drops.
function slot(cfg, rec, bind, stats) {
  if (!cfg || !test(cfg.when, withBind(rec, bind))) return null;
  const raw = extract(cfg.text, rec);
  const text = transform(cfg.transform, raw, rec);
  const ctx = withBind(rec, bind); ctx._text = text; ctx._raw = raw;
  for (const rule of cfg.drop || []) {
    if (test(rule.when, ctx)) { if (stats) stats.dropped[rule.reason] = (stats.dropped[rule.reason] || 0) + 1; return null; }
  }
  return { text, at: stamp(cfg.time, rec, raw) };
}

function withBind(rec, bind) {
  if (rec && typeof rec === 'object' && !Array.isArray(rec)) {
    const o = Object.create(rec);
    if (bind) o.$bind = bind;
    return o;
  }
  return rec;
}

module.exports = { at, test, extract, transform, stamp, slot, isBlank, withBind };
