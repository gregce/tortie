import { readFileSync } from 'node:fs';
const R = JSON.parse(readFileSync(process.env.SCR + '/m1-records.json', 'utf8'));
const T1 = r => r.thread_source === 'subagent';
const T2 = r => r.hasSourceSubagent === true;
const T3 = r => typeof r.parent_thread_id === 'string' && r.id !== null && r.parent_thread_id !== r.id;
const isSub = r => T1(r) || T2(r) || T3(r);
// what values does `source` take when it is a string?
const strSrc = {};
for (const r of R) if (Array.isArray(r.sourceKeys) && r.sourceKeys[0] === '<string>') strSrc['string'] = (strSrc['string']||0)+1;
console.log('source shapes:', [...new Set(R.map(r => JSON.stringify(r.sourceKeys)))]);
// candidate extra markers seen in payKeys
const CAND = ['multi_agent_version','subagent_history_start_ordinal','agent_nickname','agent_path','agent_role','parent_thread_id','forked_from_id','thread_source','session_id','source'];
console.log('\nkey                              on derived   on session   session-only');
for (const k of CAND) {
  const d = R.filter(r => isSub(r) && r.payKeys && r.payKeys.includes(k)).length;
  const s = R.filter(r => !isSub(r) && r.payKeys && r.payKeys.includes(k)).length;
  console.log(k.padEnd(32), String(d).padEnd(12), String(s).padEnd(12), s > 0 ? 'YES <- would false-positive' : '');
}
console.log('\nderived total:', R.filter(isSub).length, ' session total:', R.filter(r=>!isSub(r)).length);
// session_id !== id as a 4th test
const T4 = r => typeof r.session_id === 'string' && r.id !== null && r.session_id !== r.id;
console.log('\nT4 (session_id != id): flags', R.filter(T4).length, ' of which not derived by T1-3:', R.filter(r=>T4(r)&&!isSub(r)).length);
// forked_from_id != id as a candidate test (would it false-positive on a FORK?)
const T5 = r => typeof r.forked_from_id === 'string' && r.id !== null && r.forked_from_id !== r.id;
console.log('T5 (forked_from_id != id): flags', R.filter(T5).length, ' of which not derived by T1-3:', R.filter(r=>T5(r)&&!isSub(r)).length);
const ff = R.filter(r=>T5(r)&&!isSub(r));
for (const r of ff.slice(0,6)) console.log('   FORK-not-subagent:', r.id, 'forked_from=', r.forked_from_id, r.cli, r.path.replace('/Users/gdc/.codex/',''));
// multi_agent_version values
const mav = {};
for (const r of R) if (r.payKeys && r.payKeys.includes('multi_agent_version')) mav[isSub(r)?'derived':'session'] = (mav[isSub(r)?'derived':'session']||0)+1;
console.log('\nmulti_agent_version present on:', mav);
