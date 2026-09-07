/** Phase 218: which family binds which edge, by hiding a family from the
 * SHIPPING floor predicate (a token it cannot answer for is skipped). */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, wcagContrast } from 'culori';
const repoRoot='/private/tmp/wt-p218';
function rd(css:string){const d=new Map<string,string>();const re=/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
 for(let m=re.exec(css);m!==null;m=re.exec(css))d.set(m[1]!,m[2]!.replace(/\s+/g,' ').trim());
 for(let p=0;p<5;p+=1){let ch=false;for(const[n,v]of d){const nx=v.replace(/var\((--[a-zA-Z0-9-]+)\)/g,(w,r:string)=>d.get(r)??w);if(nx!==v){d.set(n,nx);ch=true;}}if(!ch)break;}return d;}
function block(css:string,s:'dark'|'light'){const head=s==='light'?":root[data-scheme='light'] {":':root {';const i=css.indexOf(head);if(i===-1)return '';const c=css.indexOf('}',i+head.length);return c===-1?'':css.slice(i+head.length,c);}
const css=readFileSync(resolve(repoRoot,'src/renderer/styles/tokens.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const derive=await import(resolve(repoRoot,'src/renderer/theme/derive.ts'));
const presets=await import(resolve(repoRoot,'src/renderer/theme/presets.ts'));
const floors=await import(resolve(repoRoot,'src/renderer/theme/floors.ts'));
const deriveOverrides=derive.deriveOverrides as any; const fff=floors.firstFloorFailure as any;
const decls=rd(block(css,'dark'));
const base:Record<string,string>={};
for(const t of[...(presets.ALL_THEME_TOKENS as string[]),'--status-idle','--bg-active']){const v=decls.get(t);if(v!==undefined)base[t]=v;}
const SHADES=[-4,-3,-2,-1,0,1,2],DEPTHS=[-3,-2,-1,0,1,2,3],LEVELS=['normal','raised','high'];
const CHROMA=(presets.CHROMATIC_PINS as {token:string}[]).map(p=>p.token);
const TEXTT=(presets.TEXT_PINS as {token:string}[]).map(p=>p.token);
function region(hide:string[]) {
  const cells:[number,number][]=[];
  for(const s of SHADES)for(const d of DEPTHS){
    let ok=true;
    outer: for(const lv of LEVELS)for(let h=0;h<360;h+=1){
      const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base);
      if(fff((t:string)=>hide.includes(t)?undefined:(o[t]??base[t]),'dark')!==null){ok=false;break outer;}
    }
    if(ok)cells.push([s,d]);
  }
  return cells;
}
function und(cells:[number,number][],lvs:string[]) {
  return cells.filter(([s,d])=>lvs.some(lv=>{for(let h=0;h<360;h+=1){const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base);
    if(wcagContrast(parse(o['--status-idle']??base['--status-idle']!)!,parse(o['--bg-active']??base['--bg-active']!)!)<3)return true;}return false;})).length;
}
const rows=(cells:[number,number][])=>SHADES.map(s=>{const ds=cells.filter(c=>c[0]===s).map(c=>c[1]).sort((a,b)=>a-b);return ds.length?`${s}:[${ds[0]}..${ds[ds.length-1]}]`:`${s}:[]`;}).join(' ');
for (const [name,hide] of [
  ['shipping (nothing hidden)', []],
  ['chromatic family hidden', CHROMA],
  ['git decorations hidden', CHROMA.filter(t=>t.startsWith('--git'))],
  ['graph lanes hidden', CHROMA.filter(t=>t.startsWith('--graph'))],
  ['accent pins hidden', CHROMA.filter(t=>t.startsWith('--accent'))],
  ['text family hidden', TEXTT],
] as [string,string[]][]) {
  const c=region(hide);
  console.log(`${name.padEnd(28)} cells=${String(c.length).padStart(2)} underNormal=${String(und(c,['normal'])).padStart(2)} underAny=${String(und(c,LEVELS)).padStart(2)}  ${rows(c)}`);
}
