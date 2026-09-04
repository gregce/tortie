import { ratio, de2000, r2, oklch } from './lib/colour.mjs';
const SLOTS = ['black','red','green','yellow','blue','magenta','cyan','white','brBlack','brRed','brGreen','brYellow','brBlue','brMagenta','brCyan','brWhite'];
export const VENDORS = {
  'Apple Terminal, system colours, light appearance': { source: 'Ghostty 1.x bundle themes/Apple System Colors Light, a sample of Terminal.app Basic profile under the light appearance', bg: '#feffff', fg: '#000000',
    p: ['#1a1a1a','#cc372e','#26a439','#cdac08','#0869cb','#9647bf','#479ec2','#98989d','#464646','#ff453a','#32d74b','#edbb00','#0a84ff','#bf5af2','#3accf7','#ffffff'] },
  'Warp, Snowy and Marble (the Light base theme is compiled into the binary)': { source: 'github.com/warpdotdev/themes warp_bundled/snowy.yaml and marble.yaml, the same sixteen', bg: '#ffffff', fg: '#000000',
    p: ['#212121','#c30771','#10a778','#a89c14','#008ec4','#523c79','#20a5ba','#e0e0e0','#212121','#fb007a','#5fd7af','#f3e430','#20bbfc','#6855de','#4fb8cc','#f1f1f1'] },
  'Ghostty, Builtin Light': { source: 'Ghostty bundle themes/Builtin Light (Ghostty ships no light default of its own; its default is Ghostty Default Style Dark)', bg: null, fg: null, p: null },
  'VS Code Light Modern': { source: 'VS Code 1.135.0 workbench.desktop.main.js terminalColorRegistry light defaults, re-read here, since light_modern.json sets terminal.foreground #3B3B3B and no terminal.ansi key', bg: '#ffffff', fg: '#3b3b3b',
    p: ['#000000','#cd3131','#107c10','#949800','#0451a5','#bc05bc','#0598bc','#555555','#666666','#cd3131','#14ce14','#b5ba00','#0451a5','#bc05bc','#0598bc','#a5a5a5'] },
  'GitHub Light Default': { source: '@primer/primitives 7.10.0 dist/json/colors/light.json ansi, through primer/github-vscode-theme src/theme.js', bg: '#ffffff', fg: '#1f2328',
    p: ['#24292f','#cf222e','#116329','#4d2d00','#0969da','#8250df','#1b7c83','#6e7781','#57606a','#a40e26','#1a7f37','#633c01','#218bff','#a475f9','#3192aa','#8c959f'] },
  'Solarized Light': { source: 'Ghostty bundle themes/Builtin Solarized Light, Ethan Schoonover base03..base3 and the eight accents', bg: '#fdf6e3', fg: '#657b83',
    p: ['#073642','#dc322f','#859900','#b58900','#268bd2','#d33682','#2aa198','#bbb5a2','#002b36','#cb4b16','#586e75','#657b83','#839496','#6c71c4','#93a1a1','#fdf6e3'] }
};
import { readFileSync } from 'node:fs';
const gl = readFileSync('/Applications/Ghostty.app/Contents/Resources/ghostty/themes/Builtin Light', 'utf8');
const pal = []; let bg = '', fg = '';
for (const line of gl.split('\n')) { let m = /palette = (\d+)=(#[0-9a-f]{6})/i.exec(line); if (m) pal[Number(m[1])] = m[2]; m = /^background = (#[0-9a-f]{6})/i.exec(line); if (m) bg = m[1]; m = /^foreground = (#[0-9a-f]{6})/i.exec(line); if (m) fg = m[1]; }
VENDORS['Ghostty, Builtin Light'].p = pal; VENDORS['Ghostty, Builtin Light'].bg = bg; VENDORS['Ghostty, Builtin Light'].fg = fg;
if (process.argv.includes('--table')) {
  console.log('| slot | ' + Object.keys(VENDORS).map((k) => k.split(',')[0].split(' (')[0]).join(' | ') + ' |');
  for (let i = 0; i < 16; i += 1) {
    console.log(`| ${SLOTS[i]} | ` + Object.values(VENDORS).map((v) => `${v.p[i]} ${r2(ratio(v.p[i], v.bg))}`).join(' | ') + ' |');
  }
  console.log('| ground | ' + Object.values(VENDORS).map((v) => v.bg).join(' | ') + ' |');
  console.log('| foreground | ' + Object.values(VENDORS).map((v) => `${v.fg} ${r2(ratio(v.fg, v.bg))}`).join(' | ') + ' |');
  console.log('| slots under 3:1 | ' + Object.values(VENDORS).map((v) => v.p.map((h, i) => [SLOTS[i], ratio(h, v.bg)]).filter(([, r]) => r < 3).map(([s, r]) => `${s} ${r2(r)}`).join(', ') || 'none').join(' | ') + ' |');
  console.log('| slots under 4.5:1 | ' + Object.values(VENDORS).map((v) => v.p.map((h, i) => [SLOTS[i], ratio(h, v.bg)]).filter(([, r]) => r < 4.5).map(([s]) => s).join(', ') || 'none').join(' | ') + ' |');
  console.log('| bright vs normal, min dE2000 | ' + Object.values(VENDORS).map((v) => { let min = 999, at = ''; for (let i = 0; i < 8; i += 1) { const d = de2000(v.p[i], v.p[i + 8]); if (d < min) { min = d; at = SLOTS[i]; } } return `${r2(min)} at ${at}`; }).join(' | ') + ' |');
  console.log('| bright pairs identical | ' + Object.values(VENDORS).map((v) => { const same = []; for (let i = 0; i < 8; i += 1) if (v.p[i].toLowerCase() === v.p[i + 8].toLowerCase()) same.push(SLOTS[i]); return same.join(', ') || 'none'; }).join(' | ') + ' |');
  for (const [k, v] of Object.entries(VENDORS)) console.log(`\n${k}: ${v.source}`);
}
