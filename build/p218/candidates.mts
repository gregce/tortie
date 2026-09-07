/** Phase 218 answer A: the candidate table for the dark base. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, formatHex, parse, differenceCiede2000 } from 'culori';
const repoRoot='/private/tmp/wt-p218';
const toRgb=converter('rgb'), toOklch=converter('oklch'), toOklab=converter('oklab');
const dE=differenceCiede2000();
function relLum(css:string){const c=toRgb(parse(css)!)!;const f=(v:number)=>{const s=Math.round(v*255)/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
function ratio(a:string,b:string){const x=relLum(a),y=relLum(b);return x>y?(x+0.05)/(y+0.05):(y+0.05)/(x+0.05);}
function rd(css:string){const d=new Map<string,string>();const re=/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
 for(let m=re.exec(css);m!==null;m=re.exec(css))d.set(m[1]!,m[2]!.replace(/\s+/g,' ').trim());
 for(let p=0;p<5;p+=1){let ch=false;for(const[n,v]of d){const nx=v.replace(/var\((--[a-zA-Z0-9-]+)\)/g,(w,r:string)=>d.get(r)??w);if(nx!==v){d.set(n,nx);ch=true;}}if(!ch)break;}return d;}
function block(css:string){const i=css.indexOf(':root {');const c=css.indexOf('}',i+7);return css.slice(i+7,c);}
const css=readFileSync(resolve(repoRoot,'src/renderer/styles/tokens.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const decls=rd(block(css));
const derive=await import(resolve(repoRoot,'src/renderer/theme/derive.ts'));
const presets=await import(resolve(repoRoot,'src/renderer/theme/presets.ts'));
const deriveOverrides=derive.deriveOverrides as any;
const base:Record<string,string>={};
for(const t of[...(presets.ALL_THEME_TOKENS as string[]),'--status-idle','--text-muted','--text-secondary','--bg-active']){const v=decls.get(t);if(v!==undefined)base[t]=v;}
const region=presets.FRAME_REGION as {shade:number;minDepth:number;maxDepth:number}[];
// every distinct active fill over the region, once
const grounds=new Set<string>();
for(const row of region)for(let d=row.minDepth;d<=row.maxDepth;d+=1)for(const lv of ['normal','raised','high'])for(let h=0;h<360;h+=1){
  const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:row.shade,chromeDepth:d},base);
  grounds.add(o['--bg-active']??base['--bg-active']!);
}
const G=[...grounds];
const shipped=base['--status-idle']!, muted=base['--text-muted']!, sec=base['--text-secondary']!;
const sh=toOklch(parse(shipped)!)!;
console.log(`shipped --status-idle ${shipped} OKLCH L ${sh.l!.toFixed(4)}   --text-muted ${muted} OKLCH L ${toOklch(parse(muted)!)!.l!.toFixed(4)}   --text-secondary ${sec} L ${toOklch(parse(sec)!)!.l!.toFixed(4)}`);
console.log(`${G.length} distinct --bg-active values over the 35 offered cells\n`);
console.log('hex      OKLCH_L  worstOnActive  onShippedActive  onCanvas  dOKLab_from_shipped  dE2000_vs_muted  Y_vs_muted');
for (let l=0.5613; l<=0.70001; l+=0.01) {
  const hex=formatHex({mode:'oklch',l,c:sh.c!,h:sh.h!})!;
  let w=Infinity; for(const g of G){const r=ratio(hex,g); if(r<w)w=r;}
  const a=toOklab(parse(hex)!)!,b=toOklab(parse(shipped)!)!;
  const d=Math.hypot(a.l!-b.l!,a.a!-b.a!,a.b!-b.b!);
  console.log(`${hex}  ${l.toFixed(4)}  ${w.toFixed(3)}${w>=3?' PASS':' fail'}      ${ratio(hex,base['--bg-active']!).toFixed(2)}          ${ratio(hex,base['--bg-canvas']!).toFixed(2)}     ${d.toFixed(4)}            ${dE(parse(hex)!,parse(muted)!).toFixed(1)}          ${relLum(hex)>relLum(muted)?'lighter':'darker '}`);
}
