import { execFileSync } from 'node:child_process'
import { existsSync, statSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
const H = homedir()
const rows = execFileSync('sqlite3', ['-separator','|','manifest-copy.db',
  "select agent,name,cwd,agent_session_id,status from sessions where removed_at is null and agent_session_id is not null;"],
  {encoding:'utf8'}).trim().split('\n').map(l=>{const [agent,name,cwd,id,status]=l.split('|');return{agent,name,cwd,id,status}})

const dashEncode = p => p.replace(/[^a-zA-Z0-9-]/g,'-')
function findCodex(id){
  // walk ~/.codex/sessions/YYYY/MM/DD for rollout-*-<id>.jsonl
  const root = join(H,'.codex','sessions')
  const out=[]
  const walk=(d,depth)=>{ if(depth>3) return; for(const e of readdirSync(d,{withFileTypes:true})){
    if(e.isDirectory()) walk(join(d,e.name),depth+1)
    else if(e.name.endsWith(id+'.jsonl')) out.push(join(d,e.name)) } }
  try{ walk(root,0) }catch{}
  return out[0]
}
for(const r of rows){
  let p=null
  if(r.agent==='claude') p = join(H,'.claude','projects',dashEncode(r.cwd),r.id+'.jsonl')
  else if(r.agent==='codex') p = findCodex(r.id)
  else if(r.agent==='grok') p = join(H,'.grok','sessions',encodeURIComponent(r.cwd),r.id,'updates.jsonl')
  else if(r.agent==='antigravity') p = join(H,'.gemini','antigravity-cli','brain',r.id,'.system_generated','logs','transcript_full.jsonl')
  else if(r.agent==='pi') p = null
  else if(r.agent==='muse') p = null
  const ok = p && existsSync(p)
  console.log([r.agent,r.status,r.name,ok?statSync(p).size:'-',p??'-'].join('\t'))
}
