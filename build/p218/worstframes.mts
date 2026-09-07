import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { converter, parse } from 'culori';
const repoRoot='/private/tmp/wt-p218';
const toRgb=converter('rgb');
function relLum(css:string){const c=toRgb(parse(css)!)!;const f=(v:number)=>{const s=Math.round(v*255)/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b);}
function ratio(a:string,b:string){const x=relLum(a),y=relLum(b);return x>y?(x+0.05)/(y+0.05):(y+0.05)/(x+0.05);}
function rd(css:string){const d=new Map<string,string>();const re=/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g;
 for(let m=re.exec(css);m!==null;m=re.exec(css))d.set(m[1]!,m[2]!.replace(/\s+/g,' ').trim());
 for(let p=0;p<5;p+=1){let ch=false;for(const[n,v]of d){const nx=v.replace(/var\((--[a-zA-Z0-9-]+)\)/g,(w,r:string)=>d.get(r)??w);if(nx!==v){d.set(n,nx);ch=true;}}if(!ch)break;}return d;}
function block(css:string,s:'dark'|'light'){const head=s==='light'?":root[data-scheme='light'] {":':root {';const i=css.indexOf(head);if(i===-1)return '';const c=css.indexOf('}',i+head.length);return c===-1?'':css.slice(i+head.length,c);}
const css=readFileSync(resolve(repoRoot,'src/renderer/styles/tokens.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const derive=await import(resolve(repoRoot,'src/renderer/theme/derive.ts'));
const presets=await import(resolve(repoRoot,'src/renderer/theme/presets.ts'));
const deriveOverrides=derive.deriveOverrides as any;
for (const [scheme,frames] of [['dark',[[2,0,134,'normal'],[-2,3,63,'high'],[0,1,121,'normal'],[0,0,121,'high'],[0,0,222,'normal']]],['light',[[0,0,301,'high'],[0,0,222,'normal']]]] as [ 'dark'|'light', [number,number,number,string][] ][]) {
  const decls=scheme==='dark'?rd(block(css,'dark')):rd(`${block(css,'dark')}\n${block(css,'light')}`);
  const base:Record<string,string>={};
  for(const t of[...(presets.ALL_THEME_TOKENS as string[]),'--status-idle','--status-exited','--status-failed','--bg-active']){const v=decls.get(t);if(v!==undefined)base[t]=v;}
  console.log(`--- ${scheme}`);
  for(const [s,d,h,lv] of frames){
    const o=deriveOverrides({highlightScheme:'blue',contrastLevel:lv,chromeHue:h,chromeShade:s,chromeDepth:d},base);
    const bg=o['--bg-active']??base['--bg-active']!, fg=o['--status-idle']??base['--status-idle']!;
    console.log(`  shade ${String(s).padStart(2)} depth ${String(d).padStart(2)} hue ${String(h).padStart(3)} ${lv.padEnd(6)}  --bg-active ${bg}  dot ${fg}  ratio ${ratio(fg,bg).toFixed(3)}  cand#8b93a1 ${ratio('#8b93a1',bg).toFixed(3)}  failed ${ratio(o['--status-failed']??base['--status-failed']!,bg).toFixed(3)}`);
  }
}
