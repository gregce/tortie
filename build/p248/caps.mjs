#!/usr/bin/env node
/**
 * caps.mjs — the ceiling arithmetic, over the widths the app run measured.
 *
 * It reads build/p248/out-readings.json, which holds the min-content and
 * max-content width of every real table in this repository as the shipping
 * pipeline laid it out, and prints what a given box width would cost. It
 * launches nothing and spawns nothing. Run it to re-derive research 112
 * section 3 without a ten minute app run, or with a different candidate cap:
 *
 *   node build/p248/caps.mjs 509 962 1114 1200
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const say = (l) => console.log(`[p248-caps] ${l}`);
const r = JSON.parse(readFileSync(resolve(join(HERE, 'out-readings.json')), 'utf8'));
const all = [];
for (const c of r.corpus ?? []) {
  for (let i = 0; i < c.count; i += 1) all.push({ min: c.min[i], max: c.max[i], cols: c.cols[i] });
}
if (all.length === 0) { say('no corpus in the readings — run the probe with P248_CORPUS unset'); process.exit(2); }

const caps = process.argv.slice(2).map(Number).filter((n) => Number.isFinite(n));
const list = caps.length > 0 ? caps : [509, 600, 720, 840, 960, 1080, 1114, 1200, 1400, 1751];
const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]; };

say(`${all.length} real tables, measured in the running app`);
for (const p of [50, 75, 90, 95, 99, 100]) {
  say(`  min-content p${String(p).padStart(3)}: ${String(pct(all.map((t) => t.min), p)).padStart(5)} px    max-content p${String(p).padStart(3)}: ${String(pct(all.map((t) => t.max), p)).padStart(6)} px`);
}
say('');
for (const cap of list) {
  const ok = all.filter((t) => t.min <= cap).length;
  say(`  a box of ${String(cap).padStart(5)} px: ${String(ok).padStart(4)} of ${String(all.length)} cut no column (${((ok / all.length) * 100).toFixed(1)}%), ${String(all.length - ok).padStart(4)} still cut`);
}
say('');
const byCols = new Map();
for (const t of all) {
  const e = byCols.get(t.cols) ?? [0, 0];
  e[0] += 1;
  if (t.min > 509) e[1] += 1;
  byCols.set(t.cols, e);
}
say('cut in the SHIPPED 509 px box, by column count:');
for (const c of [...byCols.keys()].sort((a, b) => a - b)) {
  const [n, cut] = byCols.get(c);
  say(`  ${String(c).padStart(2)} columns: ${String(cut).padStart(4)} of ${String(n).padStart(4)} (${((cut / n) * 100).toFixed(0)}%)`);
}
const over = all.filter((t) => t.min > 1114).sort((a, b) => a.min - b.min);
say('');
say(`the ${String(over.length)} tables a 1,114 px box still cuts: ${over.map((t) => `${String(t.min)}/${String(t.cols)}col`).join(' ')}`);
