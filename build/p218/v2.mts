import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse, wcagContrast } from 'culori';
const repoRoot = '/private/tmp/wt-p218';
function readDeclarations(css: string) { const d = new Map<string,string>(); const re=/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
 for(let m=re.exec(css);m!==null;m=re.exec(css)) d.set(m[1]!, m[2]!.replace(/\s+/g,' ').trim());
 for(let p=0;p<5;p+=1){let ch=false;for(const [n,v] of d){const nx=v.replace(/var\((--[a-zA-Z0-9-]+)\)/g,(w,r:string)=>d.get(r)??w);if(nx!==v){d.set(n,nx);ch=true;}}if(!ch)break;} return d; }
function block(css:string,s:'dark'|'light'){const head=s==='light'?":root[data-scheme='light'] {":':root {';const i=css.indexOf(head);if(i===-1)return '';const c=css.indexOf('}',i+head.length);return c===-1?'':css.slice(i+head.length,c);}
const css = readFileSync(resolve(repoRoot,'src/renderer/styles/tokens.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const decls = readDeclarations(block(css,'dark'));
const derive = await import(resolve(repoRoot,'src/renderer/theme/derive.ts'));
const presets = await import(resolve(repoRoot,'src/renderer/theme/presets.ts'));
const floors = await import(resolve(repoRoot,'src/renderer/theme/floors.ts'));
const deriveOverrides = derive.deriveOverrides as any; const firstFloorFailure = floors.firstFloorFailure as any;
const base: Record<string,string> = {};
for (const t of [...(presets.ALL_THEME_TOKENS as string[]), '--status-idle','--status-exited','--bg-active']) { const v=decls.get(t); if(v!==undefined) base[t]=v; }
const SHADES=[-4,-3,-2,-1,0,1,2], DEPTHS=[-3,-2,-1,0,1,2,3];
function feasible(s:number,d:number,levels:string[],step=1){ for(const lv of levels) for(let h=0;h<360;h+=step){ const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base); if(firstFloorFailure((t:string)=>o[t]??base[t],'dark')!==null) return false; } return true; }
function dotUnder(s:number,d:number,lv:string){ for(let h=0;h<360;h+=1){ const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base); if(wcagContrast(parse(o['--status-idle']??base['--status-idle']!)!,parse(o['--bg-active']??base['--bg-active']!)!)<3) return true; } return false; }
for (const levels of [['normal','raised'],['normal','high'],['raised','high'],['high'],['raised']]) {
  const cells:[number,number][]=[]; for(const s of SHADES) for(const d of DEPTHS) if(feasible(s,d,levels)) cells.push([s,d]);
  const un=cells.filter(([s,d])=>dotUnder(s,d,'normal')).length;
  const ua=cells.filter(([s,d])=>['normal','raised','high'].some(l=>dotUnder(s,d,l))).length;
  console.log(`levels=${levels.join('+')} cells=${cells.length} underNormal=${un} underAny=${ua}`);
}
