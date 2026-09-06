import { readFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(process.env.SCR + '/m1-records.json', 'utf8'));
const byId = new Map();
for (const r of R) if (typeof r.id === 'string') byId.set(r.id.toLowerCase(), r);
console.log('distinct ids on disk:', byId.size, 'of', R.length, 'rollouts');
// filename uuid vs line-1 id
const mismatchName = R.filter(r => typeof r.id === 'string' && r.id.toLowerCase() !== r.fnUuid.toLowerCase());
console.log('line-1 id != filename uuid:', mismatchName.length);
const noId = R.filter(r => typeof r.id !== 'string');
console.log('rollouts with no line-1 id:', noId.length, noId.slice(0,3).map(r=>r.path));

const T1 = r => r.thread_source === 'subagent';
const T2 = r => r.hasSourceSubagent === true;
const T3 = r => typeof r.parent_thread_id === 'string' && r.id !== null && r.parent_thread_id !== r.id;
const isSub = r => T1(r) || T2(r) || T3(r);
const parentOf = r => {
  const top = typeof r.parent_thread_id === 'string' ? r.parent_thread_id : null;
  const nest = r.spawn && typeof r.spawn.parent_thread_id === 'string' ? r.spawn.parent_thread_id : null;
  return top ?? nest;
};
const subs = R.filter(isSub);
console.log('\nderived records:', subs.length);
const nop = subs.filter(r => parentOf(r) === null);
console.log('derived with NO parent id anywhere:', nop.length);
for (const r of nop) console.log('  ', r.id, 'ts=' + r.thread_source, 'srcSub=' + r.hasSourceSubagent, 'spawn=' + JSON.stringify(r.spawn), r.cli, r.path.replace('/Users/gdc/.codex/',''));

const BOUND = 32;
const out = { resolved: {}, missingParent: 0, noParent: 0, cycle: 0, overBound: 0 };
const missEx = [], cycEx = [];
for (const r of subs) {
  const seen = new Set([String(r.id).toLowerCase()]);
  let cur = r, hops = 0, verdict = null;
  for (;;) {
    const p = parentOf(cur);
    if (!p) { verdict = 'noParent'; break; }
    const k = p.toLowerCase();
    if (seen.has(k)) { verdict = 'cycle'; break; }
    const nxt = byId.get(k);
    if (!nxt) { verdict = 'missingParent'; if (missEx.length < 8) missEx.push({ from: r.id, hops, missing: p, path: r.path.replace('/Users/gdc/.codex/','') }); break; }
    seen.add(k); hops++;
    if (hops > BOUND) { verdict = 'overBound'; break; }
    if (!isSub(nxt)) { verdict = 'resolved'; break; }
    cur = nxt;
  }
  if (verdict === 'resolved') out.resolved[hops] = (out.resolved[hops] || 0) + 1;
  else out[verdict]++;
}
console.log('\n== walk from every derived record to the nearest non-derived ancestor ==');
console.log('resolved, by hop count:', out.resolved);
console.log('missingParent:', out.missingParent, ' noParent:', out.noParent, ' cycle:', out.cycle, ' overBound:', out.overBound);
console.log('missing-parent examples:', missEx);

// self references
const self = R.filter(r => { const p = parentOf(r); return p && r.id && p.toLowerCase() === r.id.toLowerCase(); });
console.log('\nself-referencing parent (top or nested):', self.length);
// how many rollouts are named as a parent
const named = new Set();
for (const r of subs) { const p = parentOf(r); if (p) named.add(p.toLowerCase()); }
console.log('distinct ids named as a parent:', named.size,
  ' present on disk:', [...named].filter(k => byId.has(k)).length,
  ' absent:', [...named].filter(k => !byId.has(k)).length);
const presentParents = [...named].map(k => byId.get(k)).filter(Boolean);
console.log('of the present parents, themselves derived:', presentParents.filter(isSub).length);
// two-hop reality check: parents that are themselves derived
const midParents = presentParents.filter(isSub);
console.log('mid-chain parents (derived, and named as a parent):', midParents.length);
for (const r of midParents.slice(0,6)) console.log('  ', r.id, 'depth=' + (r.spawn?r.spawn.depth:null), 'parent=' + parentOf(r), 'present=' + byId.has(String(parentOf(r)).toLowerCase()));
