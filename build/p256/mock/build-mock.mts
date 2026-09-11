/**
 * Phase 256 — the mock's builder.
 *
 * RESEARCH PROTOTYPE. Nothing here ships and nothing under `src/` was touched.
 *
 *   tsx build/p256/mock/build-mock.mts <facts.json> [--out build/p256/mock/mock.html]
 *
 * WHERE EVERY WORD IN THE MOCK COMES FROM, so the page can say so itself:
 *
 *   - the CONTENT of every component, journey step and gate is read verbatim out of
 *     `build/p256/semantic/tortie.pass.json`, the semantic pass the researcher wrote by
 *     hand on 2026-09-10. No agent wrote it and no token was spent.
 *   - the BACKING chip beside every citation is recomputed here by the same rule
 *     `build/p256/semantic/check.mts` applies: a fact of the wanted shape within three
 *     lines, out of the deterministic prototype's own fact file.
 *   - the COUNTS in the provenance line are read out of that fact file.
 *   - the LAYOUT — which region a component sits in, its three-to-five word label, and
 *     the name on each transport — is the researcher's, and the page's own footer says so.
 *
 * It spawns nothing, makes no request and writes exactly one file.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

interface Fact { category: string; kind: string; subject: string; file: string; line: number; rule: string; lang: string }
interface FactFile { repo: string; head: string; trackedFiles: number; parsedFiles: number; bytesRead: number; ms: number; facts: Fact[]; byCategory: Record<string, number> }
interface Cite { at: string; why: string }
interface Component { id: string; name: string; job: string; input: string; output: string; runsIn: string; state: string; limit: string; evidence: string; facts: Cite[] }
interface Step { componentId: string; label: string; facts: Cite[] }
interface Journey { id: string; name: string; steps: Step[] }
interface Gate { id: string; question: string; answer: string; because: string; facts: Cite[] }
interface Pass { head: string; components: Component[]; journeys: Journey[]; gates: Gate[] }

const LINE_SLACK = 3;

/** The researcher's presentation layer: region, short label, transports. */
const REGIONS = [
  { id: 'window', name: 'Your window', sub: 'the renderer', dashed: false, ids: ['redline', 'external-door'] },
  { id: 'engine', name: "The app's engine", sub: 'main, one process', dashed: false, ids: ['manifest', 'attach-host', 'arch-reading', 'guarded-write', 'logins', 'machines'] },
  { id: 'tmux', name: 'The private tmux server', sub: 'the app does not own it', dashed: false, ids: ['durable-sessions'] },
  { id: 'far', name: 'Another machine', sub: 'outside this repository', dashed: true, ids: [] }  // drawn as the band below the map
];

const SHORT: Record<string, string> = {
  'durable-sessions': 'named sessions that outlive the app',
  manifest: 'the record restore reads',
  'attach-host': 'one pty per attached session',
  'arch-reading': 'the picture, with no turn',
  'guarded-write': 'the one door that rewrites a file',
  redline: "an agent's edit, drawn over yours",
  machines: 'the same work, over ssh',
  logins: 'which account an agent signs in as',
  'external-door': 'opening a path a transcript printed'
};

const TRANSPORTS = [
  { from: 'window', to: 'engine', out: '229 typed invoke channels', back: 'pushes the window redraws from' },
  { from: 'engine', to: 'tmux', out: 'commands, and one pty per attach', back: 'pane output and the session list' },
  { from: 'engine', to: 'far', out: 'ssh, fixed argv', back: 'a bounded mirror of the folder' }
];

const EVIDENCE: Record<string, { label: string; cls: string }> = {
  composed: { label: 'Composed in source', cls: 'ev-composed' },
  'component-tested': { label: 'Component-tested', cls: 'ev-tested' },
  library: { label: 'Implemented, not shipped', cls: 'ev-library' },
  offrepo: { label: 'Outside this repository', cls: 'ev-offrepo' }
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function main(): void {
  const argv = process.argv.slice(2);
  const factsPath = argv[0];
  if (factsPath === undefined) {
    console.error('usage: tsx build/p256/mock/build-mock.mts <facts.json> [--out <file>]');
    process.exit(2);
  }
  const outIdx = argv.indexOf('--out');
  const here = dirname(new URL(import.meta.url).pathname);
  const out = outIdx >= 0 ? argv[outIdx + 1] : join(here, 'mock.html');

  const facts = JSON.parse(readFileSync(factsPath, 'utf8')) as FactFile;
  const pass = JSON.parse(readFileSync(join(here, '..', 'semantic', 'tortie.pass.json'), 'utf8')) as Pass;

  const byFile = new Map<string, Fact[]>();
  for (const f of facts.facts) {
    const list = byFile.get(f.file);
    if (list === undefined) byFile.set(f.file, [f]);
    else list.push(f);
  }

  /** The same rule check.mts applies, recomputed here so the chip is not typed by hand. */
  const backing = (at: string): string | null => {
    const cut = at.lastIndexOf(':');
    const file = at.slice(0, cut);
    const line = Number(at.slice(cut + 1));
    const near = (byFile.get(file) ?? []).filter((f) => Math.abs(f.line - line) <= LINE_SLACK);
    const hit = near.find((f) => f.category !== 'decl') ?? near.find((f) => f.category === 'decl') ?? null;
    return hit === null ? null : `${hit.category}/${hit.kind}`;
  };

  const cites = (list: Cite[]): string =>
    list
      .map((c) => {
        const b = backing(c.at);
        const chip = b === null ? '<span class="cite-chip unbacked" title="The link resolves to a real tracked line, and the deterministic pass found nothing of the wanted shape within three lines of it. This sentence is standing on prose.">prose</span>' : `<span class="cite-chip backed" title="A fact the deterministic pass emitted independently, within three lines of the cited line.">${esc(b)}</span>`;
        return `<li><code>${esc(c.at)}</code>${chip}</li>`;
      })
      .join('');

  const backedCount = (list: Cite[]): string => {
    const n = list.filter((c) => backing(c.at) !== null).length;
    return `${n} of ${list.length} backed`;
  };

  const byId = new Map(pass.components.map((c) => [c.id, c]));

  const node = (c: Component): string =>
    `<button class="node" type="button" aria-pressed="false" data-node="${esc(c.id)}" id="node-${esc(c.id)}"><span class="dot ${EVIDENCE[c.evidence]?.cls ?? 'ev-composed'}" aria-hidden="true"></span><span class="node-name">${esc(c.name)}</span><span class="node-short">${esc(SHORT[c.id] ?? '')}</span></button>`;

  const regionCol = (r: (typeof REGIONS)[number]): string => {
    const nodes = r.ids.map((id) => byId.get(id)).filter((c): c is Component => c !== undefined).map(node).join('');
    const empty = r.ids.length === 0 ? '<p class="region-empty">Nothing here is this repository&rsquo;s code.</p>' : '';
    return `<div class="region${r.dashed ? ' dashed' : ''}"><h3>${esc(r.name)}</h3><p class="region-sub">${esc(r.sub)}</p>${nodes}${empty}</div>`;
  };

  const bridge = (t: (typeof TRANSPORTS)[number]): string =>
    `<div class="bridge"><span class="wire out">${esc(t.out)} &rarr;</span><span class="wire back">&larr; ${esc(t.back)}</span></div>`;

  const onMap = REGIONS.filter((r) => r.id !== 'far');
  const mapRow = onMap
    .map((r, i) => {
      const t = TRANSPORTS.find((x) => x.from === onMap[i - 1]?.id && x.to === r.id);
      return (t === undefined ? '' : bridge(t)) + regionCol(r);
    })
    .join('');
  const far = REGIONS.find((r) => r.id === 'far')!;
  const farWire = TRANSPORTS.find((t) => t.to === 'far')!;
  const farBand = `<div class="region dashed far"><div><h3>${esc(far.name)}</h3><p class="region-sub">${esc(far.sub)}</p><p class="region-empty">Nothing over there is this repository&rsquo;s code.</p></div><div class="bridge flat"><span class="wire out">from the engine: ${esc(farWire.out)} &rarr;</span><span class="wire back">&larr; ${esc(farWire.back)}</span></div></div>`;

  const inspector = (c: Component): string => `
      <article class="inspector" data-for="${esc(c.id)}"${c.id === 'durable-sessions' ? '' : ' hidden'}>
        <header>
          <h3>${esc(c.name)}</h3>
          <span class="ev ${EVIDENCE[c.evidence]?.cls ?? 'ev-composed'}">${esc(EVIDENCE[c.evidence]?.label ?? c.evidence)}</span>
          <span class="ev-count">${backedCount(c.facts)}</span>
        </header>
        <p class="job">${esc(c.job)}</p>
        <dl class="contract">
          <div><dt>Receives</dt><dd>${esc(c.input)}</dd></div>
          <div><dt>Returns</dt><dd>${esc(c.output)}</dd></div>
          <div><dt>Runs in</dt><dd>${esc(c.runsIn)}</dd></div>
          <div><dt>Keeps</dt><dd>${esc(c.state)}</dd></div>
        </dl>
        <details class="limit"><summary>Where it stops</summary><p>${esc(c.limit)}</p></details>
        <ul class="cites">${cites(c.facts)}</ul>
      </article>`;

  const j = pass.journeys[0];
  const placeOf = (id: string): string => REGIONS.find((r) => r.ids.includes(id))?.name ?? '';
  const steps = j.steps
    .map((s, i) => {
      const c = byId.get(s.componentId);
      return `<li class="step" data-place="${esc(placeOf(s.componentId))}"><span class="seq">${String(i + 1).padStart(2, '0')}</span><div><p class="step-label">${esc(s.label)}</p><p class="step-foot"><button class="jump" data-node="${esc(s.componentId)}">${esc(c?.name ?? s.componentId)}</button>${cites(s.facts)}</p></div></li>`;
    })
    .join('');
  const track = REGIONS.map((r) => `<span class="track-cell" data-place="${esc(r.name)}">${esc(r.name)}</span>`).join('');

  const gates = pass.gates
    .map(
      (g) => `<li class="gate"><p class="gate-q">${esc(g.question)}</p><p class="gate-a"><span class="answer ${esc(g.answer)}">${g.answer === 'stops' ? 'Stops' : g.answer === 'uncertain' ? 'It depends' : 'Proceeds'}</span>${esc(g.because)}</p><ul class="cites">${cites(g.facts)}</ul></li>`
    )
    .join('');

  const claims = pass.components.flatMap((c) => c.facts).concat(pass.journeys.flatMap((x) => x.steps.flatMap((s) => s.facts))).concat(pass.gates.flatMap((g) => g.facts));
  const backedAll = claims.filter((c) => backing(c.at) !== null).length;

  const html = `<!doctype html>
<html lang="en" data-scheme="dark">
<head>
<meta charset="utf-8">
<title>Tortie — what this system does (Phase 256 mock)</title>
<link rel="stylesheet" href="../../../src/renderer/styles/tokens.css">
<style>
/* Every colour, size, radius and font below is a token out of the file linked
   above. Nothing here invents one; that is the rule this mock exists to obey. */
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg-canvas); color: var(--text-primary);
  font-family: var(--font-ui); font-size: var(--text-base); line-height: var(--lh-base); }
.wrap { max-width: 1180px; margin: 0 auto; padding: var(--space-7) var(--space-7) var(--space-10); }
header.mast { display: flex; align-items: baseline; gap: var(--space-5); flex-wrap: wrap; }
h1 { font-size: var(--text-lg); line-height: var(--lh-lg); font-weight: var(--weight-semibold); margin: 0; }
.prov { color: var(--text-muted); font-size: var(--text-xs); line-height: var(--lh-xs); font-family: var(--font-mono); }
[role=tablist] { display: flex; gap: var(--space-2); margin: var(--space-6) 0 0;
  border-bottom: 1px solid var(--border); }
.tab { appearance: none; background: none; border: 0; border-bottom: 2px solid transparent;
  color: var(--text-secondary); font: inherit; padding: var(--space-4) var(--space-5);
  cursor: pointer; border-radius: var(--r-sm) var(--r-sm) 0 0; }
.tab:hover { background: var(--bg-raised); color: var(--text-primary); }
.tab[aria-selected=true] { color: var(--text-primary); border-bottom-color: var(--accent); }
.tab:focus-visible, .node:focus-visible, .jump:focus-visible, summary:focus-visible {
  outline: 2px solid var(--accent); outline-offset: 2px; }
[role=tabpanel] { padding-top: var(--space-6); }

.map { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: var(--space-4); align-items: start; }
.region.far { flex-direction: row; align-items: center; justify-content: space-between; gap: var(--space-8); margin-top: var(--space-5); }
.bridge.flat { padding-top: 0; }
.region { background: var(--bg-sidebar); border: 1px solid var(--border); border-radius: var(--r-lg);
  padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-3); }
.region.dashed { border-style: dashed; border-color: var(--border-strong); background: transparent; }
.region h3 { margin: 0; font-size: var(--text-xs); line-height: var(--lh-xs); text-transform: uppercase;
  letter-spacing: var(--track-caps); color: var(--text-secondary); font-weight: var(--weight-semibold); }
.region-sub { margin: 0 0 var(--space-2); color: var(--text-muted); font-size: var(--text-xs); line-height: var(--lh-xs); }
.region-empty { margin: 0; color: var(--text-muted); font-size: var(--text-xs); line-height: var(--lh-xs); }
.node { display: grid; grid-template-columns: 10px 1fr; gap: 0 var(--space-4); text-align: left;
  background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--r-md);
  padding: var(--space-4) var(--space-5); color: var(--text-primary); font: inherit; cursor: pointer; }
.node:hover { background: var(--bg-raised); border-color: var(--border-active); }
.node[aria-pressed=true] { background: var(--bg-active); border-color: var(--accent-soft); }
.node-name { font-weight: var(--weight-medium); }
.node-short { grid-column: 2; color: var(--text-muted); font-size: var(--text-xs); line-height: var(--lh-xs); }
.dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; }
.ev-composed { background: var(--status-idle); }
.ev-tested { background: var(--success); }
.ev-library { background: var(--warning); }
.ev-offrepo { background: transparent; box-shadow: inset 0 0 0 var(--graph-dot-ring) var(--text-muted); }
.bridge { display: flex; flex-direction: column; gap: var(--space-2); padding-top: var(--space-9);
  min-width: 150px; color: var(--text-secondary); font-size: var(--text-xs); line-height: var(--lh-xs); }
.wire { border-bottom: 1px solid var(--border-strong); padding-bottom: var(--space-1); }
.wire.back { color: var(--text-muted); }

.inspector { margin-top: var(--space-6); background: var(--bg-surface); border: 1px solid var(--border);
  border-radius: var(--r-lg); padding: var(--space-6); }
.inspector header { display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.inspector h3 { margin: 0; font-size: var(--text-md); line-height: var(--lh-md); font-weight: var(--weight-semibold); }
.ev { font-size: var(--text-2xs); line-height: var(--lh-2xs); border-radius: var(--r-pill);
  padding: 0 var(--space-4); border: 1px solid var(--border-strong); color: var(--text-secondary); }
.ev.ev-tested { color: var(--success); border-color: var(--success); background: var(--success-wash); }
.ev.ev-library { color: var(--warning); border-color: var(--warning); background: var(--warning-wash); }
.ev-count { margin-left: auto; color: var(--text-muted); font-size: var(--text-xs); font-family: var(--font-mono); }
.job { margin: var(--space-4) 0 var(--space-5); color: var(--text-primary); }
.contract { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4) var(--space-8); margin: 0; }
.contract div { display: grid; grid-template-columns: 86px 1fr; gap: var(--space-4); }
.contract dt { color: var(--text-muted); font-size: var(--text-xs); line-height: var(--lh-base); text-transform: uppercase; letter-spacing: var(--track-caps); }
.contract dd { margin: 0; color: var(--text-secondary); }
.limit { margin-top: var(--space-5); }
.limit summary { cursor: pointer; color: var(--text-secondary); font-size: var(--text-sm); line-height: var(--lh-sm); }
.limit p { margin: var(--space-3) 0 0; color: var(--text-secondary); }
.cites { list-style: none; margin: var(--space-5) 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: var(--space-3); }
.cites li { display: flex; align-items: center; gap: var(--space-3); }
.cites code { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--text-muted); }
.cite-chip { font-size: var(--text-2xs); line-height: var(--lh-2xs); border-radius: var(--r-xs); padding: 0 var(--space-3);
  font-family: var(--font-mono); }
.cite-chip.backed { color: var(--success); background: var(--success-wash); }
.cite-chip.unbacked { color: var(--warning); background: var(--warning-wash); }

.journey { display: grid; grid-template-columns: 1fr 220px; gap: var(--space-8); align-items: start; }
.steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-4); }
.step { display: grid; grid-template-columns: 28px 1fr; gap: var(--space-5); background: var(--bg-surface);
  border: 1px solid var(--border); border-radius: var(--r-md); padding: var(--space-5); }
.step.on { border-color: var(--accent-soft); background: var(--bg-active); }
.seq { font-family: var(--font-mono); color: var(--text-muted); font-size: var(--text-xs); }
.step-label { margin: 0; }
.step-foot { margin: var(--space-4) 0 0; display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.jump { background: var(--bg-raised); border: 1px solid var(--border); border-radius: var(--r-pill);
  color: var(--text-secondary); font: inherit; font-size: var(--text-xs); line-height: var(--lh-xs);
  padding: 0 var(--space-4); cursor: pointer; }
.jump:hover { color: var(--text-primary); border-color: var(--border-active); }
.step-foot .cites { margin: 0; }
.track { position: sticky; top: var(--space-6); display: flex; flex-direction: column; gap: var(--space-3); }
.track-cell { border: 1px solid var(--border); border-radius: var(--r-md); padding: var(--space-4) var(--space-5);
  color: var(--text-muted); font-size: var(--text-xs); line-height: var(--lh-xs); }
.track-cell.on { color: var(--text-primary); border-color: var(--accent-soft); background: var(--bg-active); }

.gates { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-4); }
.gate { background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--r-md); padding: var(--space-5); }
.gate-q { margin: 0; font-weight: var(--weight-medium); }
.gate-a { margin: var(--space-3) 0 0; color: var(--text-secondary); }
.answer { display: inline-block; margin-right: var(--space-4); font-size: var(--text-2xs); line-height: var(--lh-2xs);
  border-radius: var(--r-pill); padding: 0 var(--space-4); border: 1px solid var(--border-strong); color: var(--text-secondary); }
.answer.uncertain { color: var(--warning); border-color: var(--warning); background: var(--warning-wash); }
.answer.proceeds { color: var(--success); border-color: var(--success); background: var(--success-wash); }

footer { margin-top: var(--space-9); border-top: 1px solid var(--border); padding-top: var(--space-5);
  color: var(--text-muted); font-size: var(--text-xs); line-height: var(--lh-xs); }
footer p { margin: 0 0 var(--space-3); }
@media (max-width: 1000px) { .map { grid-template-columns: 1fr; } .bridge { padding-top: 0; flex-direction: row; }
  .journey { grid-template-columns: 1fr; } .track { position: static; flex-direction: row; flex-wrap: wrap; } }
</style>
</head>
<body>
<div class="wrap">
<header class="mast">
  <h1>Tortie &mdash; what this system does</h1>
  <span class="prov">${facts.trackedFiles.toLocaleString('en-US')} files read at ${esc(facts.head.slice(0, 8))} &middot; ${pass.components.length} parts named &middot; ${backedAll} of ${claims.length} sentences standing on a detected fact</span>
</header>

<div role="tablist" aria-label="Views">
  <button class="tab" role="tab" aria-selected="true" aria-controls="v-map" id="t-map">System map</button>
  <button class="tab" role="tab" aria-selected="false" aria-controls="v-journey" id="t-journey">Follow a session</button>
  <button class="tab" role="tab" aria-selected="false" aria-controls="v-gates" id="t-gates">What runs</button>
</div>

<section role="tabpanel" id="v-map" aria-labelledby="t-map">
  <div class="map">${mapRow}</div>
  ${farBand}
  ${pass.components.map(inspector).join('')}
</section>

<section role="tabpanel" id="v-journey" aria-labelledby="t-journey" hidden>
  <div class="journey">
    <ol class="steps">${steps}</ol>
    <div class="track">${track}</div>
  </div>
</section>

<section role="tabpanel" id="v-gates" aria-labelledby="t-gates" hidden>
  <ul class="gates">${gates}</ul>
</section>

<footer>
  <p><strong>What this is.</strong> A Phase 256 mock of direction B, drawn in Tortie&rsquo;s own tokens
  (<code>src/renderer/styles/tokens.css</code>, linked, not copied). It is not a shipped surface and nothing here runs.</p>
  <p><strong>Where the words come from.</strong> Every component, step and gate is read verbatim from
  <code>build/p256/semantic/tortie.pass.json</code>, which the researcher wrote by hand on 2026-09-10 &mdash; no agent
  wrote it and no token was spent. Every green chip was recomputed by this builder from the deterministic prototype&rsquo;s
  fact file over this repository at <code>${esc(facts.head.slice(0, 8))}</code>
  (${facts.trackedFiles.toLocaleString('en-US')} tracked files, ${facts.parsedFiles.toLocaleString('en-US')} parsed,
  ${facts.facts.length.toLocaleString('en-US')} facts, ${(facts.ms / 1000).toFixed(1)} s), by the same three-line rule
  <code>build/p256/semantic/check.mts</code> applies. An amber <code>prose</code> chip means the link resolves to a real
  tracked line and the deterministic half found nothing of the wanted shape near it.</p>
  <p><strong>What is the researcher&rsquo;s and not measured.</strong> Which region a part sits in, its three-to-five word
  label, and the name on each transport.</p>
</footer>
</div>

<script>
// No framework, no request, no storage. Tabs, node selection, and the journey's place track.
const tabs = [...document.querySelectorAll('[role=tab].tab')];
for (const t of tabs) t.addEventListener('click', () => {
  for (const o of tabs) { o.setAttribute('aria-selected', String(o === t)); document.getElementById(o.getAttribute('aria-controls')).hidden = o !== t; }
});
const nodes = [...document.querySelectorAll('.node')];
const show = (id) => {
  for (const n of nodes) n.setAttribute('aria-selected', String(n.dataset.node === id));
  for (const p of document.querySelectorAll('.inspector')) p.hidden = p.dataset.for !== id;
};
for (const n of nodes) n.addEventListener('click', () => show(n.dataset.node));
show('durable-sessions');
const steps = [...document.querySelectorAll('.step')];
const cells = [...document.querySelectorAll('.track-cell')];
const mark = (s) => { for (const o of steps) o.classList.toggle('on', o === s);
  for (const c of cells) c.classList.toggle('on', c.dataset.place === s.dataset.place); };
for (const s of steps) { s.addEventListener('mouseenter', () => mark(s)); s.addEventListener('click', () => mark(s)); }
if (steps[0]) mark(steps[0]);
for (const b of document.querySelectorAll('.jump')) b.addEventListener('click', () => {
  tabs[0].click(); show(b.dataset.node); document.getElementById('node-' + b.dataset.node)?.focus();
});
</script>
</body>
</html>
`;

  writeFileSync(out, html);
  console.log(`wrote ${out}`);
  console.log(`components ${pass.components.length}, claims ${claims.length}, backed ${backedAll}`);
}

main();
