import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
const decls=rd(`${block(css,'dark')}\n${block(css,'light')}`);
const base:Record<string,string>={};
for(const t of[...(presets.ALL_THEME_TOKENS as string[]),'--status-idle','--status-exited','--bg-active']){const v=decls.get(t);if(v!==undefined)base[t]=v;}
const SHADES=[-4,-3,-2,-1,0,1,2],DEPTHS=[-3,-2,-1,0,1,2,3],LEVELS=['normal','raised','high'];
for (const schemes of [['blue'],['blue','teal','purple','slate']]) {
  const cells:[number,number,string][]=[];
  for(const s of SHADES)for(const d of DEPTHS){
    let fail:any=null, at='';
    outer: for(const hs of schemes)for(const lv of LEVELS)for(let h=0;h<360;h+=1){
      const o=deriveOverrides({highlightScheme:hs,contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base);
      const f=fff((t:string)=>o[t]??base[t],'light'); if(f!==null){fail=f;at=`${hs}/${lv}/hue ${h}`;break outer;}
    }
    if(fail===null) cells.push([s,d,'']); else if (s===-1||s===0||s===1) console.log(`   refused ${s},${d}: ${JSON.stringify(fail)} at ${at}`);
  }
  console.log(`schemes=${schemes.join(',')} light region cells=${cells.length}: ${cells.map(c=>`${c[0]},${c[1]}`).join(' | ')}`);
  console.log(`  pinned FRAME_REGION_LIGHT: ${JSON.stringify(presets.FRAME_REGION_LIGHT)}`);
}
