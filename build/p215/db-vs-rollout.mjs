import { readFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(process.env.SCR + '/m1-records.json', 'utf8'));
const T = JSON.parse(readFileSync(process.env.SCR + '/db-threads.json', 'utf8'));
const E = JSON.parse(readFileSync(process.env.SCR + '/db-edges.json', 'utf8'));
const lc = s => typeof s === 'string' ? s.toLowerCase() : s;
const disk = new Map(R.map(r => [lc(r.id), r]));
const db = new Map(T.map(t => [lc(t.id), t]));
const childEdge = new Map(E.map(e => [lc(e.child_thread_id), e]));

console.log('rollouts on disk:', disk.size, ' threads rows:', db.size, ' edges:', E.length);
const onlyDisk = [...disk.keys()].filter(k => !db.has(k));
const onlyDb = [...db.keys()].filter(k => !disk.has(k));
console.log('id on disk but not in db:', onlyDisk.length, onlyDisk.slice(0,3));
console.log('id in db but no rollout on disk with that id:', onlyDb.length, onlyDb.slice(0,3).map(k=>db.get(k).rollout_path));

// rollout_path in db points at the same file we scanned?
let pathOk = 0, pathBad = 0; const badEx = [];
for (const [k, t] of db) { const d = disk.get(k); if (!d) continue; if (d.path === t.rollout_path) pathOk++; else { pathBad++; if (badEx.length<5) badEx.push({ id:k, db:t.rollout_path, disk:d.path }); } }
console.log('rollout_path equals the scanned path:', pathOk, ' differs:', pathBad, badEx);

const T1 = r => r.thread_source === 'subagent';
const T2 = r => r.hasSourceSubagent === true;
const T3 = r => typeof r.parent_thread_id === 'string' && r.id !== null && r.parent_thread_id !== r.id;
const diskSub = r => T1(r) || T2(r) || T3(r);
// database verdict: thread_source==='subagent' OR an edge names it as a child
const dbSub = (k) => { const t = db.get(k); return (t && t.thread_source === 'subagent') || childEdge.has(k); };
const dbSubColumnOnly = (k) => { const t = db.get(k); return !!(t && t.thread_source === 'subagent'); };

let agree = 0, dbOnly = 0, diskOnly = 0, bothNo = 0;
const dbOnlyEx = [], diskOnlyEx = [];
for (const [k, r] of disk) {
  if (!db.has(k)) continue;
  const a = diskSub(r), b = dbSub(k);
  if (a && b) agree++;
  else if (b && !a) { dbOnly++; if (dbOnlyEx.length<8) dbOnlyEx.push({ id:k, dbTs: db.get(k).thread_source, edge: childEdge.get(k), diskTs: r.thread_source, srcSub: r.hasSourceSubagent, parent: r.parent_thread_id, spawn: r.spawn, cli: r.cli }); }
  else if (a && !b) { diskOnly++; if (diskOnlyEx.length<8) diskOnlyEx.push({ id:k, dbTs: db.get(k).thread_source, diskTs: r.thread_source, srcSub: r.hasSourceSubagent, parent: r.parent_thread_id, spawn: r.spawn, cli: r.cli, path: r.path.replace('/Users/gdc/.codex/','') }); }
  else bothNo++;
}
console.log('\n== agreement, database (thread_source OR edge) vs rollout (three tests) ==');
console.log({ bothDerived: agree, dbOnly, diskOnly, bothSession: bothNo, comparable: agree+dbOnly+diskOnly+bothNo });
console.log('db-says-derived / disk-says-not:', dbOnlyEx);
console.log('disk-says-derived / db-says-not:', diskOnlyEx);

// column alone
let agree2=0, dbOnly2=0, diskOnly2=0, bothNo2=0;
for (const [k, r] of disk) { if (!db.has(k)) continue; const a=diskSub(r), b=dbSubColumnOnly(k);
  if(a&&b)agree2++; else if(b&&!a)dbOnly2++; else if(a&&!b)diskOnly2++; else bothNo2++; }
console.log('\n== agreement, database COLUMN ALONE vs rollout three tests ==');
console.log({ bothDerived: agree2, dbOnly: dbOnly2, diskOnly: diskOnly2, bothSession: bothNo2 });

// parent agreement where both name one
const parentOf = r => { const t = typeof r.parent_thread_id==='string'?r.parent_thread_id:null; const n = r.spawn&&typeof r.spawn.parent_thread_id==='string'?r.spawn.parent_thread_id:null; return t ?? n; };
let pAgree=0, pDis=0, pDbOnly=0, pDiskOnly=0; const pDisEx=[];
for (const [k, r] of disk) {
  const dp = childEdge.has(k) ? lc(childEdge.get(k).parent_thread_id) : null;
  const rp = lc(parentOf(r));
  if (dp && rp) { if (dp===rp) pAgree++; else { pDis++; if(pDisEx.length<5) pDisEx.push({id:k,db:dp,disk:rp}); } }
  else if (dp) pDbOnly++; else if (rp) pDiskOnly++;
}
console.log('\n== parent id agreement ==', { agree: pAgree, disagree: pDis, edgeOnly: pDbOnly, rolloutOnly: pDiskOnly }, pDisEx);
