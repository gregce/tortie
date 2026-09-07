/** Phase 218: what fraction of FRAMES (cell x hue) is under 3:1, per level. */
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
const deriveOverrides=derive.deriveOverrides as any;
const region=(presets.FRAME_REGION as {shade:number;minDepth:number;maxDepth:number}[]);
const decls=rd(block(css,'dark'));
const base:Record<string,string>={};
for(const t of[...(presets.ALL_THEME_TOKENS as string[]),'--status-idle','--bg-active']){const v=decls.get(t);if(v!==undefined)base[t]=v;}
for (const lv of ['normal','raised','high']) {
  let n=0,u=0;
  for(const row of region) for(let d=row.minDepth;d<=row.maxDepth;d+=1) for(let h=0;h<360;h+=1){
    const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:row.shade,chromeDepth:d},base);
    n+=1; if(wcagContrast(parse(o['--status-idle']??base['--status-idle']!)!,parse(o['--bg-active']??base['--bg-active']!)!)<3)u+=1;
  }
  console.log(`${lv}: ${u} of ${n} frames under 3:1 = ${(100*u/n).toFixed(1)}%  (11/40 would be 27.5%)`);
}
