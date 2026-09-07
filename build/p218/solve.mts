/** Phase 218 answer A: solve for dot colours that hold 3:1 on --bg-active at
 * every offered frame, on both bases. Runs the SHIPPING derivation. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, formatHex, parse, wcagContrast, wcagLuminance, differenceCiede2000 } from 'culori';
const repoRoot='/private/tmp/wt-p218';
const toOklch=converter('oklch'), toOklab=converter('oklab'), toRgb=converter('rgb');
const dE=differenceCiede2000();
function rd(css:string){const d=new Map<string,string>();const re=/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
 for(let m=re.exec(css);m!==null;m=re.exec(css))d.set(m[1]!,m[2]!.replace(/\s+/g,' ').trim());
 for(let p=0;p<5;p+=1){let ch=false;for(const[n,v]of d){const nx=v.replace(/var\((--[a-zA-Z0-9-]+)\)/g,(w,r:string)=>d.get(r)??w);if(nx!==v){d.set(n,nx);ch=true;}}if(!ch)break;}return d;}
function block(css:string,s:'dark'|'light'){const head=s==='light'?":root[data-scheme='light'] {":':root {';const i=css.indexOf(head);if(i===-1)return '';const c=css.indexOf('}',i+head.length);return c===-1?'':css.slice(i+head.length,c);}
const css=readFileSync(resolve(repoRoot,'src/renderer/styles/tokens.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const derive=await import(resolve(repoRoot,'src/renderer/theme/derive.ts'));
const presets=await import(resolve(repoRoot,'src/renderer/theme/presets.ts'));
const deriveOverrides=derive.deriveOverrides as any;
const LEVELS=['normal','raised','high'];

function setup(scheme:'dark'|'light'){
  const decls = scheme==='dark'?rd(block(css,'dark')):rd(`${block(css,'dark')}\n${block(css,'light')}`);
  const base:Record<string,string>={};
  for(const t of[...(presets.ALL_THEME_TOKENS as string[]),'--status-idle','--status-exited','--status-working','--status-attention','--status-failed','--text-muted','--text-secondary','--text-primary','--text-disabled','--bg-active']){const v=decls.get(t);if(v!==undefined)base[t]=v;}
  const region=(presets.frameRegionFor as any)(scheme) as {shade:number;minDepth:number;maxDepth:number}[];
  // every distinct --bg-active over the whole offered region
  const grounds=new Map<string,{shade:number;depth:number;hue:number;level:string}>();
  for(const row of region) for(let d=row.minDepth;d<=row.maxDepth;d+=1) for(const lv of LEVELS) for(let h=0;h<360;h+=1){
    const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:row.shade,chromeDepth:d},base);
    const g=o['--bg-active']??base['--bg-active']!;
    if(!grounds.has(g)) grounds.set(g,{shade:row.shade,depth:d,hue:h,level:lv});
  }
  return {base,region,grounds};
}

for (const scheme of ['dark','light'] as const) {
  const {base,grounds}=setup(scheme);
  console.log(`\n########## ${scheme.toUpperCase()} ##########`);
  console.log(`distinct --bg-active values over the offered region: ${grounds.size}`);
  const ys=[...grounds.keys()].map(g=>({g,y:wcagLuminance(parse(g)!)}));
  ys.sort((a,b)=>a.y-b.y);
  const lo=ys[0]!, hi=ys[ys.length-1]!;
  console.log(`  darkest ${lo.g} Y=${lo.y.toFixed(5)}  (${JSON.stringify(grounds.get(lo.g))})`);
  console.log(`  lightest ${hi.g} Y=${hi.y.toFixed(5)}  (${JSON.stringify(grounds.get(hi.g))})`);
  // Every status token's worst over the region (they are fixed except for the chroma lift)
  console.log('  every status token, worst on --bg-active over the region:');
  for (const tok of ['--status-working','--status-attention','--status-idle','--status-exited','--status-failed']) {
    let worst=Infinity, at='';
    const region=(presets.frameRegionFor as any)(scheme);
    for(const row of region) for(let d=row.minDepth;d<=row.maxDepth;d+=1) for(const lv of LEVELS) for(let h=0;h<360;h+=1){
      const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:row.shade,chromeDepth:d},base);
      const r=wcagContrast(parse(o[tok]??base[tok]!)!,parse(o['--bg-active']??base['--bg-active']!)!);
      if(r<worst){worst=r;at=`shade ${row.shade} depth ${d} hue ${h} ${lv}`;}
    }
    console.log(`    ${tok.padEnd(20)} shipped ${base[tok]}  worst ${worst.toFixed(3)}  at ${at}  ${worst<3?'UNDER':'ok'}`);
  }
  // required luminance for a fixed colour to clear 3:1 on every ground
  const needLighter = 3*(hi.y+0.05)-0.05;
  const needDarker = (lo.y+0.05)/3-0.05;
  console.log(`  a FIXED colour clears 3:1 on every one of those grounds iff Y >= ${needLighter.toFixed(5)} (lighter side) or Y <= ${needDarker.toFixed(5)} (darker side)`);
  // candidates: keep the shipped hue & chroma, raise/lower L until it passes
  const shipped=base['--status-idle']!;
  const sh=toOklch(parse(shipped)!)!;
  console.log(`  shipped --status-idle ${shipped} OKLCH L=${sh.l!.toFixed(4)} C=${sh.c!.toFixed(4)} H=${(sh.h??0).toFixed(1)}`);
  const cands: {hex:string;label:string}[]=[];
  const dir = scheme==='dark'?1:-1;
  for (let l=sh.l!; l>=0 && l<=1; l+=dir*0.0005) {
    const hex=formatHex({mode:'oklch',l,c:sh.c!,h:sh.h!})!;
    const y=wcagLuminance(parse(hex)!);
    if (dir===1 ? y>=needLighter : y<=needDarker) { cands.push({hex,label:`same hue+chroma, L=${l.toFixed(4)}`}); break; }
  }
  // a slack-bearing variant, one notch past the minimum
  if (cands.length) {
    const c0=toOklch(parse(cands[0]!.hex)!)!;
    for (const extra of [0.005,0.010,0.015,0.020]) {
      const l=c0.l!+dir*extra;
      cands.push({hex:formatHex({mode:'oklch',l,c:sh.c!,h:sh.h!})!,label:`+${extra.toFixed(3)} L of slack`});
    }
  }
  for (const c of cands) {
    // full walk verification
    let worst=Infinity, at='';
    const region=(presets.frameRegionFor as any)(scheme);
    for(const row of region) for(let d=row.minDepth;d<=row.maxDepth;d+=1) for(const lv of LEVELS) for(let h=0;h<360;h+=1){
      const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:row.shade,chromeDepth:d},base);
      const r=wcagContrast(parse(c.hex)!,parse(o['--bg-active']??base['--bg-active']!)!);
      if(r<worst){worst=r;at=`shade ${row.shade} depth ${d} hue ${h} ${lv}`;}
    }
    const a=toOklab(parse(c.hex)!)!, b=toOklab(parse(shipped)!)!;
    const dist=Math.hypot(a.l!-b.l!,a.a!-b.a!,a.b!-b.b!);
    const vsMuted=wcagContrast(parse(c.hex)!,parse(base['--text-muted']!)!);
    const dEmuted=dE(parse(c.hex)!,parse(base['--text-muted']!)!);
    const dEdisabled=dE(parse(c.hex)!,parse(base['--text-disabled']!)!);
    const dEworking=dE(parse(c.hex)!,parse(base['--status-working']!)!);
    const yC=wcagLuminance(parse(c.hex)!), yM=wcagLuminance(parse(base['--text-muted']!)!), yS=wcagLuminance(parse(base['--text-secondary']!)!);
    console.log(`  CAND ${c.hex}  ${c.label.padEnd(28)} worstOnActive=${worst.toFixed(3)} at ${at}`);
    console.log(`       dOKLab from shipped ${dist.toFixed(4)} | vs --text-muted: ratio ${vsMuted.toFixed(3)} dE2000 ${dEmuted.toFixed(1)} (dot ${yC>yM?'LIGHTER':'darker'} than muted) | dE2000 vs --text-disabled ${dEdisabled.toFixed(1)} | vs --status-working ${dEworking.toFixed(1)}`);
    console.log(`       Y: cand ${yC.toFixed(4)} muted ${yM.toFixed(4)} secondary ${yS.toFixed(4)}`);
  }
}
