/** Phase 218: hunt for the (40 cells, 11 under at Normal) shape the Phase 210
 * verifier reported, over plausible variant methods. */
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
const decls = rd(block(css,'dark'));
const base: Record<string,string> = {};
for (const t of [...(presets.ALL_THEME_TOKENS as string[]), '--status-idle','--status-exited','--bg-active']) { const v=decls.get(t); if(v!==undefined) base[t]=v; }
const SHADES=[-4,-3,-2,-1,0,1,2], DEPTHS=[-3,-2,-1,0,1,2,3], LEVELS=['normal','raised','high'];
const cache = new Map<string, Record<string,string>>();
function ov(lv:string,h:number,s:number,d:number){ const k=`${lv}|${h}|${s}|${d}`; let v=cache.get(k); if(v===undefined){ v=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base); cache.set(k,v);} return v; }
function run(name:string, hues:number[], levels:string[], dotHues:number[]) {
  const cells:[number,number][]=[];
  for (const s of SHADES) for (const d of DEPTHS) {
    let ok=true;
    outer: for (const lv of levels) for (const h of hues) { const o=ov(lv,h,s,d); if(firstFloorFailure((t:string)=>o[t]??base[t],'dark')!==null){ok=false;break outer;} }
    if (ok) cells.push([s,d]);
  }
  const und=(lvs:string[])=>cells.filter(([s,d])=>lvs.some(lv=>dotHues.some(h=>{const o=ov(lv,h,s,d);return wcagContrast(parse(o['--status-idle']??base['--status-idle']!)!,parse(o['--bg-active']??base['--bg-active']!)!)<3;}))).length;
  console.log(`${name.padEnd(46)} cells=${String(cells.length).padStart(2)} underNormal=${String(und(['normal'])).padStart(2)} underAny=${String(und(LEVELS)).padStart(2)}`);
}
const all=[...Array(360).keys()];
const named=(presets.FRAME_COLORS as {hue:number}[]).map(c=>c.hue);
for (const step of [1,2,3,4,5,6,9,12,15,18,20,24,30,36,40,45,60,72,90,120,180]) {
  const hs=[]; for(let h=0;h<360;h+=step) hs.push(h);
  run(`region step ${step} (dot every degree)`, hs, LEVELS, all);
}
run('region over the 8 named FRAME_COLORS', named, LEVELS, all);
run('region 8 named, dot 8 named', named, LEVELS, named);
run('region every degree, dot 8 named', all, LEVELS, named);
for (const step of [15,30,45]) { const hs=[]; for(let h=0;h<360;h+=step) hs.push(h); run(`region step ${step}, dot step ${step}`, hs, LEVELS, hs); }
