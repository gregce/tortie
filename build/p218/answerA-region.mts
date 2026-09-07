/** Phase 218: does the region survive answer A PLUS a real floor on the whole
 * status family, on both bases? Re-derives the region with the pin added. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse } from 'culori';
const repoRoot='/private/tmp/wt-p218';
const toRgb=converter('rgb');
function relLum(css:string):number{ const c=toRgb(parse(css)!)!;
  const f=(v:number)=>{const s=Math.round(v*255)/255; return s<=0.04045? s/12.92 : Math.pow((s+0.055)/1.055,2.4);};
  return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b); }
function ratio(a:string,b:string){const x=relLum(a),y=relLum(b);return x>y?(x+0.05)/(y+0.05):(y+0.05)/(x+0.05);}
function rd(css:string){const d=new Map<string,string>();const re=/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
 for(let m=re.exec(css);m!==null;m=re.exec(css))d.set(m[1]!,m[2]!.replace(/\s+/g,' ').trim());
 for(let p=0;p<5;p+=1){let ch=false;for(const[n,v]of d){const nx=v.replace(/var\((--[a-zA-Z0-9-]+)\)/g,(w,r:string)=>d.get(r)??w);if(nx!==v){d.set(n,nx);ch=true;}}if(!ch)break;}return d;}
function block(css:string,s:'dark'|'light'){const head=s==='light'?":root[data-scheme='light'] {":':root {';const i=css.indexOf(head);if(i===-1)return '';const c=css.indexOf('}',i+head.length);return c===-1?'':css.slice(i+head.length,c);}
const css=readFileSync(resolve(repoRoot,'src/renderer/styles/tokens.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const derive=await import(resolve(repoRoot,'src/renderer/theme/derive.ts'));
const presets=await import(resolve(repoRoot,'src/renderer/theme/presets.ts'));
const floors=await import(resolve(repoRoot,'src/renderer/theme/floors.ts'));
const deriveOverrides=derive.deriveOverrides as any; const fff=floors.firstFloorFailure as any;
const SHADES=[-4,-3,-2,-1,0,1,2],DEPTHS=[-3,-2,-1,0,1,2,3],LEVELS=['normal','raised','high'];
const FAMILY=['--status-working','--status-attention','--status-idle','--status-exited','--status-failed'];
function run(scheme:'dark'|'light', dot:string|null, label:string){
  const decls=scheme==='dark'?rd(block(css,'dark')):rd(`${block(css,'dark')}\n${block(css,'light')}`);
  const base:Record<string,string>={};
  for(const t of[...(presets.ALL_THEME_TOKENS as string[]),...FAMILY,'--bg-active']){const v=decls.get(t);if(v!==undefined)base[t]=v;}
  if(dot!==null){base['--status-idle']=dot;base['--status-exited']=dot;}
  const cells:[number,number][]=[]; let worstFam=Infinity, at='', tok='';
  for(const s of SHADES)for(const d of DEPTHS){
    let ok=true;
    outer: for(const lv of LEVELS)for(let h=0;h<360;h+=1){
      const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base);
      if(fff((t:string)=>o[t]??base[t],scheme)!==null){ok=false;break outer;}
      for(const f of FAMILY){ if(ratio(o[f]??base[f]!,o['--bg-active']??base['--bg-active']!)<3){ok=false;break outer;} }
    }
    if(ok)cells.push([s,d]);
  }
  // worst of the family over the cells that survived
  for(const [s,d] of cells) for(const lv of LEVELS) for(let h=0;h<360;h+=1){
    const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base);
    for(const f of FAMILY){const r=ratio(o[f]??base[f]!,o['--bg-active']??base['--bg-active']!); if(r<worstFam){worstFam=r;at=`shade ${s} depth ${d} hue ${h} ${lv}`;tok=f;}}
  }
  const rows=SHADES.map(s=>{const ds=cells.filter(c=>c[0]===s).map(c=>c[1]).sort((a,b)=>a-b);return ds.length?`${s}:[${ds[0]}..${ds[ds.length-1]}]`:`${s}:[]`;}).join(' ');
  const hasDefault=cells.some(([s,d])=>s===0&&d===0);
  console.log(`${scheme} ${label.padEnd(34)} cells=${String(cells.length).padStart(2)} default(0,0)=${hasDefault?'IN ':'OUT'} worstFamily=${worstFam.toFixed(3)} (${tok} at ${at})`);
  console.log(`         ${rows}`);
}
run('dark', null, 'B: shipped dot + status pinned');
run('dark', '#858c9a', 'A(min) #858c9a + status pinned');
run('dark', '#8b92a1', 'A(slack) #8b92a1 + status pinned');
run('light', null, 'shipped light + status pinned');
