/** Phase 218: the full 7x7 grid — feasibility and dot floor, both bases. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, wcagContrast } from 'culori';
const repoRoot = '/private/tmp/wt-p218';
function rd(css: string) { const d=new Map<string,string>(); const re=/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
 for(let m=re.exec(css);m!==null;m=re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g,' ').trim());
 for(let p=0;p<5;p+=1){let ch=false;for(const [n,v] of d){const nx=v.replace(/var\((--[a-zA-Z0-9-]+)\)/g,(w,r:string)=>d.get(r)??w);if(nx!==v){d.set(n,nx);ch=true;}}if(!ch)break;} return d; }
function block(css:string,s:'dark'|'light'){const head=s==='light'?":root[data-scheme='light'] {":':root {';const i=css.indexOf(head);if(i===-1)return '';const c=css.indexOf('}',i+head.length);return c===-1?'':css.slice(i+head.length,c);}
const css = readFileSync(resolve(repoRoot,'src/renderer/styles/tokens.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const derive = await import(resolve(repoRoot,'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot,'src/renderer/theme/presets.ts'));
const floors = await import(resolve(repoRoot,'src/renderer/theme/floors.ts'));
const deriveOverrides = derive.deriveOverrides as any; const firstFloorFailure = floors.firstFloorFailure as any;
const scheme = (process.argv[2] ?? 'dark') as 'dark'|'light';
const decls = scheme==='dark' ? rd(block(css,'dark')) : rd(`${block(css,'dark')}\n${block(css,'light')}`);
const base: Record<string,string> = {};
for (const t of [...(presets.ALL_THEME_TOKENS as string[]), '--status-idle','--status-exited','--bg-active']) { const v=decls.get(t); if(v!==undefined) base[t]=v; }
const SHADES=[-4,-3,-2,-1,0,1,2], DEPTHS=[-3,-2,-1,0,1,2,3], LEVELS=['normal','raised','high'];
console.log(`base=${scheme}  grid: F=feasible(all 3 levels, every degree)  d=dot under 3 at normal  D=dot under 3 at some level`);
console.log('shade\\depth   ' + DEPTHS.map(d=>String(d).padStart(9)).join(''));
let feasCount=0, undN=0, undA=0, gridUndN=0, gridUndA=0;
const worstByCell = new Map<string, number>();
for (const s of SHADES) {
  let line = String(s).padStart(5) + '        ';
  for (const d of DEPTHS) {
    let feas = true;
    for (const lv of LEVELS) { for (let h=0;h<360;h+=1) { const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base); if(firstFloorFailure((t:string)=>o[t]??base[t],scheme)!==null){feas=false;break;} } if(!feas) break; }
    let worstN=Infinity, worstAll=Infinity;
    for (const lv of LEVELS) for (let h=0;h<360;h+=1) { const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base);
      const r=wcagContrast(parse(o['--status-idle']??base['--status-idle']!)!,parse(o['--bg-active']??base['--bg-active']!)!);
      if (lv==='normal' && r<worstN) worstN=r; if (r<worstAll) worstAll=r; }
    worstByCell.set(`${s},${d}`, worstAll);
    const dn = worstN<3, da = worstAll<3;
    if (dn) gridUndN+=1; if (da) gridUndA+=1;
    if (feas) { feasCount+=1; if(dn) undN+=1; if(da) undA+=1; }
    line += `${feas?'F':'.'}${dn?'d':'-'}${da?'D':'-'} ${worstAll.toFixed(2)}`.padStart(9);
  }
  console.log(line);
}
console.log(`feasible cells=${feasCount}  underNormal(within region)=${undN}  underAny(within region)=${undA}`);
console.log(`WHOLE 49 GRID: underNormal=${gridUndN} underAny=${gridUndA}`);
