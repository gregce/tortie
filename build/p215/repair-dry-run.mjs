import { readFileSync } from 'node:fs';
const S = process.env.SCR;
const rows = JSON.parse(readFileSync(S + '/mf-codex.json', 'utf8'));
const R = JSON.parse(readFileSync(S + '/m1-records.json', 'utf8'));
const lc = s => typeof s === 'string' ? s.toLowerCase() : s;
const byId = new Map(R.map(r => [lc(r.id), r]));
const T1 = r => r.thread_source === 'subagent';
const T2 = r => r.hasSourceSubagent === true;
const T3 = r => typeof r.parent_thread_id === 'string' && r.id !== null && r.parent_thread_id !== r.id;
const isSub = r => T1(r) || T2(r) || T3(r);
const parentOf = r => { const t = typeof r.parent_thread_id === 'string' ? r.parent_thread_id : null;
  const n = r.spawn && typeof r.spawn.parent_thread_id === 'string' ? r.spawn.parent_thread_id : null; return t ?? n; };
const BOUND = 8;

const table = [];
for (const row of rows) {
  const sid = row.agent_session_id;
  const o = { manifestId: row.id.slice(0, 8), name: row.name, status: row.status, removed: row.removed_at !== null,
    cwd: row.cwd, before: sid, after: sid, verdict: '', hops: 0, tests: '' };
  if (!sid) { o.verdict = 'no stored id, untouched'; table.push(o); continue; }
  const rec = byId.get(lc(sid));
  if (!rec) { o.verdict = 'rollout not on disk, LEFT ALONE'; table.push(o); continue; }
  o.tests = (T1(rec) ? '1' : '.') + (T2(rec) ? '2' : '.') + (T3(rec) ? '3' : '.');
  if (!isSub(rec)) { o.verdict = 'already a session, byte identical'; table.push(o); continue; }
  // walk
  const seen = new Set([lc(sid)]); let cur = rec, hops = 0, done = null;
  for (;;) {
    const p = parentOf(cur);
    if (!p) { done = 'no parent named, LEFT ALONE'; break; }
    if (seen.has(lc(p))) { done = 'cycle, LEFT ALONE'; break; }
    const nxt = byId.get(lc(p));
    if (!nxt) { done = 'parent rollout missing, LEFT ALONE'; break; }
    seen.add(lc(p)); hops++;
    if (hops > BOUND) { done = 'over depth bound, LEFT ALONE'; break; }
    if (!isSub(nxt)) { o.after = nxt.id; o.hops = hops; done = 'REPAIRED to parent'; break; }
    cur = nxt;
  }
  o.verdict = done; table.push(o);
}
const w = (s, n) => String(s ?? '').padEnd(n).slice(0, n);
console.log(w('manifest', 9), w('name', 22), w('status', 11), w('rm', 3), w('T', 4), w('hp', 3), w('before', 38), w('after', 38), 'verdict');
for (const o of table) console.log(w(o.manifestId, 9), w(o.name, 22), w(o.status, 11), w(o.removed ? 'yes' : '-', 3), w(o.tests, 4), w(o.hops || '', 3), w(o.before, 38), w(o.after, 38), o.verdict);
const H = {}; for (const o of table) H[o.verdict] = (H[o.verdict] || 0) + 1;
console.log('\n== summary ==', H);
const moved = table.filter(o => o.before !== o.after);
console.log('rows whose id would MOVE:', moved.length, ' rows byte identical:', table.length - moved.length);
console.log('of the moved, live (not removed):', moved.filter(o => !o.removed).length, ' removed/discarded:', moved.filter(o => o.removed).length);
console.log('\nmoved rows in full:');
for (const o of moved) console.log('  ', o.manifestId, o.name, '|', o.status, o.removed ? '(removed)' : '', '|', o.before, '->', o.after, '| hops', o.hops, '| cwd', o.cwd);
