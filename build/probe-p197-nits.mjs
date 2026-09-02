#!/usr/bin/env node
/**
 * `npm run probe:p197`. Phase 197's ONE app run over every rendered item of
 * the third nits round, in one session, read off the real DOM and the real
 * system pasteboard rather than the source.
 *
 *  A  the arch panel's wording on a kind only row and on a foreign file
 *     (item 4, refuted as landed at f2e9a12 and 69d0e27): "names no place"
 *     and "names no kind this build knows" both drawn
 *  B  the usage meters with no login on this profile (item 8, refuted as
 *     landed at cf08930): nothing drawn, nothing read, and the bound itself
 *     is pinned by p181-usage-hostile-values.test.ts, which this run cites
 *     rather than re-proves, since a hover card needs a credential
 *  C  the diff control row on a file identical to HEAD (item 13, refuted as
 *     landed at 468a67d): no control row over the "No changes" state
 *  D  the backgrounds toggle is NAMED (item 14, refuted as landed at
 *     662457b): aria-label "Changed row color", and no "Change backgrounds"
 *  E  the diagnostics tables sit in a scroller of their own (item 19,
 *     contained since 30222a1): overflow-x auto, and the page never scrolls
 *     sideways
 *  F  Cmd-A in the redline view copies the NEW file byte for byte (item 21),
 *     with the person's own clipboard fingerprinted before and after
 *  G  the selected plane's hairline (item 24): --border-active is in the
 *     computed tokens at #2d3038, reads about 1.1:1 on --bg-active by the
 *     WCAG arithmetic run inside the page, --border still reads about 1.3:1
 *     on the sidebar, and both consumer rules name the token, the pressed
 *     agent tile and the Aim button under the pointer
 *
 * SAFETY. One Electron through build/electron-run.mjs on a scratch profile
 * and a scratch tmux socket, ended in that helper's finally. The scratch
 * project lives under the harness directory. No agent is spawned, no request
 * is made, nothing under the person's home is read for anything but the
 * pasteboard, which is read, then put back by the harness, and fingerprinted
 * here on both sides.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { withElectron } from './electron-run.mjs';

const TAG = '[probe:p197]';
const say = (line) => console.log(`${TAG} ${line}`);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function clipboardFingerprint() {
  const text = spawnSync('pbpaste', [], { encoding: 'utf8' }).stdout ?? '';
  const info = spawnSync('osascript', ['-e', 'clipboard info'], { encoding: 'utf8' });
  return {
    bytes: Buffer.byteLength(text),
    md5: createHash('md5').update(text).digest('hex'),
    flavours: (info.stdout ?? '').trim()
  };
}
const clipBefore = clipboardFingerprint();
say(`the clipboard held ${String(clipBefore.bytes)} bytes before this run (md5 ${clipBefore.md5.slice(0, 8)})`);

const scratch = process.env['GMUX_HARNESS_DIR'] ?? process.env['TMPDIR'] ?? tmpdir();
const rawRoot = join(scratch, 'p197-nits');
rmSync(rawRoot, { recursive: true, force: true });
mkdirSync(join(rawRoot, 'project', 'docs', 'arch', 'components'), { recursive: true });
mkdirSync(join(rawRoot, 'project', 'src', 'app'), { recursive: true });
const root = realpathSync(rawRoot);
const project = join(root, 'project');
const profile = join(root, 'profile');
mkdirSync(profile, { recursive: true });

// ---------------------------------------------------------------------------
// The fixtures: one changed prose file, one identical, one code, one markdown,
// one second prose file, and a contract with a kind only row and a foreign file.
// ---------------------------------------------------------------------------

const OLD_TEST = ['The quick brown fox jumped over the lazy dog.', '', 'A second paragraph that does not change.', ''].join('\n');
const NEW_TEST = ['The quick red fox jumped over the lazy dog.', '', 'A second paragraph that does not change.', ''].join('\n');
const FIXTURES = {
  'test.txt': [OLD_TEST, NEW_TEST],
  'same.txt': ['Nothing here changes.\n\nNot one word of it.\n', 'Nothing here changes.\n\nNot one word of it.\n'],
  'second.txt': ['A second file.\n\nIts one sentence changes here.\n', 'A second file.\n\nIts one sentence changed there.\n'],
  'guide.md': ['# Guide\n\nThe old sentence.\n', '# Guide\n\nThe new sentence.\n'],
  'sample.ts': ['export const answer = 41;\n', 'export const answer = 42;\n'],
  'src/app/index.ts': ['export const app = 1;\n', 'export const app = 1;\n']
};
const CONTRACT = {
  version: 1,
  subject: 'The p197 contract',
  strictness: 'not-wrong',
  // Three, because the format refuses fewer and the row this probe reads
  // never appears over a contract that was dropped whole.
  layers: [
    { id: 'surface', name: 'surface', order: 0 },
    { id: 'engine', name: 'engine', order: 1 },
    { id: 'foundation', name: 'foundation', order: 2 }
  ],
  flows: []
};
const APP = {
  id: 'app', name: 'app', kind: 'component', layer: 'surface',
  provenance: 'first-party', anchors: ['src/app'], boundary: 'open',
  description: 'the app'
};
for (const [name, [oldText]] of Object.entries(FIXTURES)) writeFileSync(join(project, name), oldText);
writeFileSync(join(project, 'docs', 'arch', 'contract.json'), `${JSON.stringify(CONTRACT, null, 2)}\n`);
writeFileSync(join(project, 'docs', 'arch', 'components', 'app.json'), `${JSON.stringify(APP, null, 2)}\n`);
// A kind only row: its anchors are MISSING rather than empty (Phase 177's fix round).
writeFileSync(join(project, 'docs', 'arch', 'components', 'bare.json'), '{ "kind": "store" }\n');
// A foreign file with no kind at all: skipped with the one calm line.
writeFileSync(join(project, 'docs', 'arch', 'components', 'foreign.json'), '{ "name": "left over", "owner": "someone" }\n');
for (const argv of [
  ['init', '-q', '-b', 'main'],
  ['add', '-A'],
  ['-c', 'user.email=p197@example.invalid', '-c', 'user.name=p197 probe', 'commit', '-q', '-m', 'p197 fixture']
]) {
  spawnSync('git', argv, { cwd: project, encoding: 'utf8' });
}
for (const [name, [, newText]] of Object.entries(FIXTURES)) writeFileSync(join(project, name), newText);

// ---------------------------------------------------------------------------
// The clipboard step, evaluated in the driven window after the drive. The
// drive leaves the diagnostics tab active and the arch view in the sidebar, so
// this step reads the scroller there, walks the editor to the changed file in
// Diff mode for the aria label, to the identical file for the control row,
// then back to the changed file in Redline for the Cmd-A copy.
// ---------------------------------------------------------------------------

const clipboardStep = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const p = (window.__p197 = window.__p197 || {});
  const scrollers = Array.from(document.querySelectorAll('.diag-scroll')).map((s) => ({
    overflowX: getComputedStyle(s).overflowX,
    clientWidth: s.clientWidth,
    scrollWidth: s.scrollWidth,
    table: s.querySelector('.diag-table') ? s.querySelector('.diag-table').scrollWidth : null
  }));
  p.diag = {
    scrollers,
    sessionsGroup: document.querySelector('.diag-group-sessions') !== null,
    pageScrollWidth: document.documentElement.scrollWidth,
    pageClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth
  };
  const tabFor = (name) => Array.from(document.querySelectorAll('.ed-tab')).find((t) => (t.textContent || '').includes(name)) || null;
  const mode = (label) => document.querySelector('.ed-tabs-actions .ed-mode [aria-label="' + label + '"]');
  const until = async (test) => { for (let i = 0; i < 60 && !test(); i++) await wait(100); return test(); };
  // D. The changed file in Diff mode.
  const changed = tabFor('test.txt');
  if (changed) changed.click();
  await until(() => mode('Diff') !== null);
  if (mode('Diff')) mode('Diff').click();
  await until(() => document.querySelector('[aria-label="Changed row color"]') !== null);
  await wait(300);
  p.aria = {
    changedRowColor: document.querySelector('[aria-label="Changed row color"]') !== null,
    changeBackgrounds: document.querySelector('[aria-label="Change backgrounds"]') !== null,
    checked: (document.querySelector('.ed-tabs-actions .ed-mode [role="radio"][aria-checked="true"]') || {}).getAttribute
      ? document.querySelector('.ed-tabs-actions .ed-mode [role="radio"][aria-checked="true"]').getAttribute('aria-label') : null
  };
  // C. The identical file in Diff mode: the state title, and no control row.
  const same = tabFor('same.txt');
  if (same) same.click();
  await until(() => mode('Diff') !== null);
  if (mode('Diff')) mode('Diff').click();
  await until(() => (document.querySelector('.ed-state-title') || {}).textContent === 'No changes');
  await wait(400);
  p.same = {
    stateTitle: (document.querySelector('.ed-state-title') || {}).textContent || null,
    controlRow: document.querySelector('[aria-label="Changed row color"]') !== null,
    skeleton: document.querySelector('.ed-skeleton, .ed-opening') !== null
  };
  // F. Back to the changed file, in Redline, then the Cmd-A shape.
  if (changed) changed.click();
  await until(() => mode('Redline') !== null);
  if (mode('Redline')) mode('Redline').click();
  await until(() => document.querySelector('.ed-redline-doc') !== null);
  await wait(400);
  const scroll = document.querySelector('.ed-redline-scroll');
  if (scroll) scroll.focus();
  return window.__gmuxRedlineSelect('all');
})()`;

const probeJs = `(() => {
  const cs = getComputedStyle(document.documentElement);
  const tok = (n) => cs.getPropertyValue(n).trim();
  const lin = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
  const ratio = (a, b) => { const [h, l] = [L(a), L(b)].sort((x, y) => y - x); return Math.round(((h + 0.05) / (l + 0.05)) * 1000) / 1000; };
  const tileRules = [];
  const aimRules = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const r of Array.from(sheet.cssRules)) {
        if (r.selectorText === '.agent-tile:active') tileRules.push(r.style.borderColor);
        if (r.selectorText === '.arch-aim-go:hover:not(:disabled)') aimRules.push(r.style.borderColor);
      }
    } catch (e) {}
  }
  const schema = document.querySelector('.arch-schema');
  const archText = schema ? schema.textContent || '' : '';
  const sidebarText = (document.querySelector('.sidebar') || document.body).textContent || '';
  return {
    tokens: { border: tok('--border'), borderActive: tok('--border-active'), bgActive: tok('--bg-active'), bgSidebar: tok('--bg-sidebar') },
    ratios: {
      borderOnActive: ratio(tok('--border'), tok('--bg-active')),
      borderActiveOnActive: ratio(tok('--border-active'), tok('--bg-active')),
      borderOnSidebar: ratio(tok('--border'), tok('--bg-sidebar'))
    },
    tileActiveBorder: tileRules,
    aimHoverBorder: aimRules,
    arch: {
      schemaPresent: schema !== null,
      noPlace: archText.includes('names no place'),
      noKind: sidebarText.includes('names no kind this build knows'),
      reasons: Array.from(document.querySelectorAll('.arch-schema-reason')).map((e) => e.textContent)
    },
    usage: { drawn: document.querySelectorAll('.usage-card, .usage-bar-fill, .usage-mini-row').length },
    redline: window.__gmuxP194Redline ? { journey: window.__gmuxP194Redline.journeyLog } : null,
    diag163: window.__gmuxP163Surface || null,
    p197: window.__p197 || null
  };
})()`;

const socket = process.env['GMUX_TMUX_SOCKET'] ?? `gmux-p197-${String(process.pid)}`;
let text = '';
await withElectron(
  {
    label: 'p197-nits',
    userDataDir: profile,
    tmuxSocket: socket,
    cwd: repoRoot,
    ceilingMs: 300_000,
    env: {
      GMUX_SHOT: join(root, 'p197-nits.png'),
      GMUX_SHOT_VERBOSE: '1',
      GMUX_SHOT_DELAY_MS: '3000',
      GMUX_SHOT_CLIPBOARD: JSON.stringify([clipboardStep]),
      GMUX_SHOT_DRIVE: JSON.stringify({
        projectPath: project,
        openRel: 'test.txt',
        mode: 'diff',
        editorWidth: 1200,
        redline: { rels: ['test.txt'], codeRel: 'sample.ts', markdownRel: 'guide.md', sameRel: 'same.txt', secondRel: 'second.txt' },
        diagnosticsReport: true,
        arch: { live: true, width: 340 }
      }),
      GMUX_SHOT_JS: probeJs,
      GMUX_TMUX_SOCKET: socket
    }
  },
  async (handle) => {
    say(`launched the app, pid ${String(handle.pid)}`);
    const code = await handle.exited;
    text = handle.text();
    say(`the app exited with ${String(code)}`);
  }
);
const readOne = (marker) => {
  const at = text.lastIndexOf(marker);
  if (at === -1) return null;
  try { return JSON.parse(text.slice(at + marker.length).split('\n')[0] ?? ''); } catch { return null; }
};
const reading = readOne('[gmux-shot] probe ');
const clipboard = readOne('[gmux-shot] clipboard ');
writeFileSync(join(root, 'p197-reading.json'), JSON.stringify({ reading, clipboard }, null, 2));
if (reading === null) {
  console.error(`${TAG} the driven window answered nothing.`);
  console.error(text.split('\n').slice(-40).join('\n'));
  process.exit(1);
}

const results = [];
const check = (id, claim, pass, detail) => {
  results.push({ id, claim, pass, detail });
  console.log(`${TAG} ${id}  ${pass ? 'pass' : 'FAIL'}  ${claim}  (${detail})`);
};
const p = reading.p197 ?? {};
const step = Array.isArray(clipboard) ? clipboard.find((one) => ((one ?? {}).setup ?? {}).which === 'all') ?? null : null;

check('A', 'the arch panel says "names no place" on the kind only row and "names no kind this build knows" on the foreign file',
  reading.arch.noPlace && reading.arch.noKind,
  `schema section ${String(reading.arch.schemaPresent)}, reasons ${JSON.stringify(reading.arch.reasons)}, foreign line ${String(reading.arch.noKind)}`);
check('B', 'no usage meter is drawn with no login on this profile (the countdown bound is pinned by p181-usage-hostile-values.test.ts)',
  reading.usage.drawn === 0, `${String(reading.usage.drawn)} meter elements`);
check('C', 'a file identical to HEAD draws "No changes" and no diff control row',
  p.same?.stateTitle === 'No changes' && p.same?.controlRow === false,
  `state ${JSON.stringify(p.same?.stateTitle)}, control row ${String(p.same?.controlRow)}`);
check('D', 'the backgrounds toggle is named "Changed row color" and nothing reads "Change backgrounds"',
  p.aria?.changedRowColor === true && p.aria?.changeBackgrounds === false,
  `mode ${JSON.stringify(p.aria?.checked)}, named ${String(p.aria?.changedRowColor)}, commanded ${String(p.aria?.changeBackgrounds)}`);
check('E', 'every diagnostics table sits in an overflow-x auto scroller and the page does not scroll sideways',
  Array.isArray(p.diag?.scrollers) && p.diag.scrollers.length > 0 && p.diag.scrollers.every((s) => s.overflowX === 'auto') && p.diag.pageScrollWidth === p.diag.pageClientWidth,
  `scrollers ${JSON.stringify(p.diag?.scrollers)}, page ${String(p.diag?.pageScrollWidth)} of ${String(p.diag?.pageClientWidth)}, sessions group ${String(p.diag?.sessionsGroup)}`);
check('F', 'Cmd-A, the whole body selected, copies the NEW file byte for byte',
  typeof step?.text === 'string' && step.text === NEW_TEST && step.setup?.ok === true,
  typeof step?.text === 'string' ? (step.text === NEW_TEST ? `${String(Buffer.byteLength(step.text))} bytes, equal` : `got ${JSON.stringify(step.text.slice(0, 60))}`) : 'no text');
const r = reading.ratios;
check('G', '--border-active is #2d3038, reads about 1.1:1 on --bg-active, --border still about 1.3:1 on the sidebar, and both .agent-tile:active and .arch-aim-go:hover name the token',
  reading.tokens.borderActive === '#2d3038' && r.borderActiveOnActive >= 1.09 && r.borderActiveOnActive <= 1.12 && Math.abs(r.borderOnSidebar - 1.297) <= 0.01 && reading.tileActiveBorder.some((v) => String(v).includes('--border-active')) && reading.aimHoverBorder.some((v) => String(v).includes('--border-active')),
  `tokens ${JSON.stringify(reading.tokens)}, ratios ${JSON.stringify(r)}, tile rule ${JSON.stringify(reading.tileActiveBorder)}, aim rule ${JSON.stringify(reading.aimHoverBorder)}`);
const clipAfter = clipboardFingerprint();
check('H', 'the person’s own clipboard was put back exactly',
  clipAfter.md5 === clipBefore.md5 && clipAfter.bytes === clipBefore.bytes && clipAfter.flavours === clipBefore.flavours,
  `${String(clipBefore.bytes)} bytes md5 ${clipBefore.md5.slice(0, 8)} before, ${String(clipAfter.bytes)} bytes md5 ${clipAfter.md5.slice(0, 8)} after`);

say(`reading at ${join(root, 'p197-reading.json')}, photograph at ${join(root, 'p197-nits.png')}`);
const failed = results.filter((x) => !x.pass);
if (failed.length > 0) {
  console.error(`${TAG} ${String(failed.length)} of ${String(results.length)} rows failed.`);
  process.exit(1);
}
say(`every row passed, ${String(results.length)} of ${String(results.length)}.`);
process.exit(0);
