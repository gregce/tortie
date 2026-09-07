/** Phase 218: re-derive every headline number with HAND WRITTEN WCAG
 * arithmetic (no culori contrast, no culori luminance), straight from the
 * eight bit hex the shipping derivation produced. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse } from 'culori';
const repoRoot='/private/tmp/wt-p218';
const toRgb=converter('rgb');
function hex8(css:string):[number,number,number]{
  const m=/^#([0-9a-f]{6})$/i.exec(css.trim());
  if(m) return [parseInt(m[1]!.slice(0,2),16),parseInt(m[1]!.slice(2,4),16),parseInt(m[1]!.slice(4,6),16)];
  const c=toRgb(parse(css)!)!; return [Math.round(c.r*255),Math.round(c.g*255),Math.round(c.b*255)];
}
/** WCAG 2.x relative luminance, written out from the spec. */
function relLum(css:string):number{
  const [r,g,b]=hex8(css);
  const f=(v:number)=>{const s=v/255; return s<=0.04045? s/12.92 : Math.pow((s+0.055)/1.055,2.4);};
  return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);
}
function ratio(a:string,b:string):number{const x=relLum(a),y=relLum(b);return x>y?(x+0.05)/(y+0.05):(y+0.05)/(x+0.05);}
function rd(css:string){const d=new Map<string,string>();const re=/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
 for(let m=re.exec(css);m!==null;m=re.exec(css))d.set(m[1]!,m[2]!.replace(/\s+/g,' ').trim());
 for(let p=0;p<5;p+=1){let ch=false;for(const[n,v]of d){const nx=v.replace(/var\((--[a-zA-Z0-9-]+)\)/g,(w,r:string)=>d.get(r)??w);if(nx!==v){d.set(n,nx);ch=true;}}if(!ch)break;}return d;}
function block(css:string,s:'dark'|'light'){const head=s==='light'?":root[data-scheme='light'] {":':root {';const i=css.indexOf(head);if(i===-1)return '';const c=css.indexOf('}',i+head.length);return c===-1?'':css.slice(i+head.length,c);}
const css=readFileSync(resolve(repoRoot,'src/renderer/styles/tokens.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const derive=await import(resolve(repoRoot,'src/renderer/theme/derive.ts'));
const presets=await import(resolve(repoRoot,'src/renderer/theme/presets.ts'));
const deriveOverrides=derive.deriveOverrides as any;
const LEVELS=['normal','raised','high'], SCHEMES=['blue','teal','purple','slate'];
for (const scheme of ['dark','light'] as const) {
  const decls=scheme==='dark'?rd(block(css,'dark')):rd(`${block(css,'dark')}\n${block(css,'light')}`);
  const base:Record<string,string>={};
  for(const t of[...(presets.ALL_THEME_TOKENS as string[]),'--status-idle','--status-exited','--bg-active']){const v=decls.get(t);if(v!==undefined)base[t]=v;}
  const region=(presets.frameRegionFor as any)(scheme) as {shade:number;minDepth:number;maxDepth:number}[];
  console.log(`\n### ${scheme} — hand written WCAG arithmetic`);
  console.log(`shipped --status-idle ${base['--status-idle']} on --bg-active ${base['--bg-active']} = ${ratio(base['--status-idle']!,base['--bg-active']!).toFixed(4)}:1`);
  let cells=0, undN=0, undA=0;
  const perLevel:Record<string,{w:number;at:string}>={normal:{w:Infinity,at:''},raised:{w:Infinity,at:''},high:{w:Infinity,at:''}};
  let schemeSpread=0;
  for(const row of region) for(let d=row.minDepth;d<=row.maxDepth;d+=1){
    cells+=1; let un=false, ua=false;
    for(const lv of LEVELS){ let bad=false;
      for(let h=0;h<360;h+=1){
        const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:row.shade,chromeDepth:d},base);
        const r=ratio(o['--status-idle']??base['--status-idle']!,o['--bg-active']??base['--bg-active']!);
        if(r<3)bad=true;
        if(r<perLevel[lv]!.w){perLevel[lv]!.w=r;perLevel[lv]!.at=`shade ${row.shade} depth ${d} hue ${h}`;}
        // scheme invariance: same cell under every highlight scheme
        if(h%37===0){ for(const s of SCHEMES){ const o2=deriveOverrides({highlightScheme:s,contrastLevel:lv,chromeHue:h,chromeShade:row.shade,chromeDepth:d},base);
          const r2=ratio(o2['--status-idle']??base['--status-idle']!,o2['--bg-active']??base['--bg-active']!);
          schemeSpread=Math.max(schemeSpread,Math.abs(r2-r)); } }
      }
      if(bad){ua=true; if(lv==='normal')un=true;}
    }
    if(un)undN+=1; if(ua)undA+=1;
  }
  console.log(`cells=${cells}  under 3:1 at Normal=${undN}  under 3:1 at some level=${undA}`);
  for(const lv of LEVELS) console.log(`  worst at ${lv}: ${perLevel[lv]!.w.toFixed(3)} at ${perLevel[lv]!.at}`);
  console.log(`  max |ratio(scheme) - ratio(blue)| over the sampled cells = ${schemeSpread.toExponential(2)}  (0 means the highlight scheme cannot move this reading)`);
  if (scheme==='dark') {
    // fact 1: the parent of Phase 210 — shade 0 depth 0 only
    let w=Infinity, at='';
    for(const lv of LEVELS) for(let h=0;h<360;h+=1){
      const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:0,chromeDepth:0},base);
      const r=ratio(o['--status-idle']??base['--status-idle']!,o['--bg-active']??base['--bg-active']!);
      if(r<w){w=r;at=`hue ${h} ${lv}`;}
    }
    console.log(`  PHASE 207 ALONE (shade 0 depth 0, no ramp override): worst ${w.toFixed(3)} at ${at}`);
    // the shipped dot and the candidate on every shipped ground
    for (const cand of [base['--status-idle']!, '#858c9a', '#8b92a1']) {
      const line = ['--bg-canvas','--bg-sidebar','--bg-surface','--bg-raised','--bg-active']
        .map(g=>`${g.replace('--bg-','')} ${ratio(cand,base[g]!).toFixed(2)}`).join('  ');
      console.log(`  ${cand} on the SHIPPED grounds: ${line}`);
    }
  }
}
