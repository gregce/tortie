#!/usr/bin/env node
/**
 * PHASE 245, MEASUREMENT 2. How often can a path be FOUND in a real transcript,
 * and how often does looking for one find something that is not a path?
 *
 * The corpus is this Mac's own live sessions, read through `tmux -L gmux
 * list-sessions` and `capture-pane -p -S -`. It LISTS and CAPTURES and does
 * nothing else: it never attaches, never sends a key, never kills a session and
 * never starts an agent. A session carrying no `@gmux-agent` option is not ours
 * and is skipped.
 *
 * Two detectors run over every physical row, written by different methods so
 * that where they disagree there is something to look at:
 *
 *   A  a maximal-run regex over the whole line, the generous shape a terminal
 *      emulator reaches for first
 *   B  a whitespace tokeniser plus a segment grammar, judging each token on its
 *      own after stripping the decoration a person's eye strips for free
 *
 * The one filesystem call anywhere in this measurement is `lstat`, and it is
 * made only on ABSOLUTE candidates under a refusal list. `lstat` reads metadata:
 * it does not open the file, does not follow a link and cannot execute
 * anything. NO PATH READ OUT OF A TRANSCRIPT IS EVER OPENED. Nothing is written
 * anywhere outside this process.
 *
 * IT PRINTS COUNTS, RATES AND SHAPES AND NEVER A PATH, because a transcript can
 * hold anything.
 *
 *   node build/p245/corpus-scan.mjs            read this Mac's own sessions
 *   node build/p245/corpus-scan.mjs --self-test prove the detectors on fixtures
 */

import { execFileSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import { extname } from 'node:path';
import { pathToFileURL } from 'node:url';

const TAG = '[p245]';
const say = (l) => console.log(`${TAG} ${l}`);

// ---------------------------------------------------------------------------
// Detector A — the generous maximal-run regex.
// ---------------------------------------------------------------------------
const RE_A =
  /(?:file:\/\/)?(?:~|\.{1,2})?(?:\/[^\s'"`()[\]{}<>|*?;,]+)+\/?|(?:\.{1,2}\/)?(?:[A-Za-z0-9._@+-]+\/)+[A-Za-z0-9._@+-]+/g;

export function spansA(line) {
  const out = [];
  RE_A.lastIndex = 0;
  let m;
  while ((m = RE_A.exec(line)) !== null) {
    if (!m[0].includes('/')) continue;
    out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Detector B — tokenise, strip decoration, judge each token by a grammar.
// ---------------------------------------------------------------------------
const OPEN = new Set(["'", '"', '`', '(', '[', '{', '<', '‘', '“', '«']);
const CLOSE = new Set([
  "'", '"', '`', ')', ']', '}', '>', ',', ';', '.', ':', '!', '?',
  '’', '”', '»'
]);
const SEG = /^[A-Za-z0-9._@%+~$-]+$/;

export function tokenizeB(line) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    let text = m[0];
    let start = m.index;
    while (text.length > 0 && OPEN.has(text[0])) { text = text.slice(1); start += 1; }
    while (text.length > 0 && CLOSE.has(text[text.length - 1])) text = text.slice(0, -1);
    if (text.length > 0) out.push({ text, start, end: start + text.length });
  }
  return out;
}

export function looksPathB(tok) {
  let t = tok;
  if (t.startsWith('file://')) t = t.slice(7);
  const lc = /^(.*?):(\d+)(?::(\d+))?$/.exec(t);
  if (lc && lc[1].includes('/')) t = lc[1];
  if (!t.includes('/')) return false;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t)) return false;   // a URL of some scheme
  if (/^\d+\/\d+$/.test(t)) return false;                  // 171/383, a fraction
  const segs = t.split('/');
  const body = ['', '~', '.', '..'].includes(segs[0]) ? segs.slice(1) : segs;
  if (body.length === 0) return false;
  return body.every((s) => s === '' || SEG.test(s));
}

/** Strip the decoration and answer the bare path plus what was stripped. */
export function normalise(tok) {
  let p = tok;
  const deco = [];
  if (p.startsWith('file://')) { p = p.slice(7); deco.push('file://'); }
  const lc = /^(.*?):(\d+)(?::(\d+))?$/.exec(p);
  if (lc && lc[1].includes('/')) { p = lc[1]; deco.push(lc[3] ? 'line:col' : 'line'); }
  if (p.startsWith('~/')) { p = (process.env['HOME'] ?? '') + p.slice(1); deco.push('~'); }
  return { path: p, deco };
}

// ---------------------------------------------------------------------------
// The one filesystem call, and the refusals that bound its reach.
// ---------------------------------------------------------------------------
const REFUSE = [/^\/Volumes\//, /^\/net\//, /^\/dev\//, /^\/proc/, /\/\.\.(\/|$)/];
const seen = new Map();

export function checkedLstat(p) {
  if (typeof p !== 'string' || !p.startsWith('/') || p.length > 1024) return null;
  for (const r of REFUSE) if (r.test(p)) return null;
  if (seen.has(p)) return seen.get(p);
  let answer;
  try {
    const st = lstatSync(p);
    answer = st.isDirectory() ? 'dir' : st.isSymbolicLink() ? 'link' : st.isFile() ? 'file' : 'other';
  } catch { answer = 'missing'; }
  seen.set(p, answer);
  return answer;
}

/**
 * THE CONSERVATIVE POLICY this research recommends measuring against: a span is
 * offered only when it is absolute after decoration is stripped, names at least
 * one segment, and something is really there.
 */
export function conservative(tok) {
  const { path } = normalise(tok);
  if (!path.startsWith('/')) return null;
  if (path.split('/').filter((s) => s.length > 0).length === 0) return null;
  const kind = checkedLstat(path);
  return kind !== null && kind !== 'missing' ? { path, kind } : null;
}

// ---------------------------------------------------------------------------
// Self test — the detectors are proved on fixtures so a scan that cannot fail
// is never mistaken for a scan that passed.
// ---------------------------------------------------------------------------
const FIXTURES = [
  ['/private/tmp/a/b.png', true, 'a bare absolute path'],
  ['docs/BACKLOG.md', true, 'a relative path'],
  ['src/lib/db.ts:281', true, 'a path with a line number'],
  ['~/.codex/auth.json', true, 'a tilde path'],
  ['file:///private/tmp/a.html', true, 'a file URL, whose scheme is stripped before the grammar runs'],
  ['https://example.invalid/a/b', false, 'an http URL'],
  ['origin/main', true, 'a git ref is INDISTINGUISHABLE from a relative path'],
  ['America/Chicago', true, 'a timezone is INDISTINGUISHABLE from a relative path'],
  ['171/383', false, 'a fraction'],
  ['/', true, 'the bare root passes the GRAMMAR and is refused by the policy below, not here'],
  ['and/or', true, 'prose with a slash is INDISTINGUISHABLE from a relative path']
];

function selfTest() {
  let bad = 0;
  for (const [text, want, why] of FIXTURES) {
    const got = looksPathB(text);
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${TAG} ${ok ? 'OK  ' : 'FAIL'} looksPathB(${JSON.stringify(text)}) = ${String(got)} — ${why}`);
  }
  const c1 = conservative('/') === null;
  const c2 = conservative('/private/tmp/definitely-not-here-p245') === null;
  console.log(`${TAG} ${c1 && c2 ? 'OK  ' : 'FAIL'} the conservative policy refuses the bare root and a path that is not there`);
  if (!c1 || !c2) bad++;
  console.log(`${TAG} ${bad === 0 ? 'every fixture behaved' : `${String(bad)} fixtures did not`}`);
  return bad === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// The corpus. LIST and CAPTURE only.
//
// Guarded so the detectors above can be IMPORTED without a capture running as
// a side effect (build/p245/root-cost.mjs imports them). Running this file
// directly behaves exactly as it did when the numbers in research 107 sections
// 1 to 4 were taken; nothing above this line changed.
// ---------------------------------------------------------------------------
const RUN_DIRECTLY =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;
if (RUN_DIRECTLY && process.argv.includes('--self-test')) process.exit(selfTest());
if (RUN_DIRECTLY) {
const SOCKET = 'gmux';
const tmux = (...a) => execFileSync('tmux', ['-L', SOCKET, ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let sessions;
try {
  sessions = tmux('list-sessions', '-F', '#{session_id}').trim().split('\n').filter(Boolean);
} catch {
  console.error(`${TAG} no sessions on -L ${SOCKET}. Nothing to measure.`);
  process.exit(2);
}

const IMG = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.heic', '.bmp', '.tiff', '.ico', '.pdf']);
const MD = new Set(['.md', '.mdx', '.markdown']);
const SECRETISH = /(auth\.json|\.credentials\.json|\.env(\.|$)|id_rsa|id_ed25519|\.pem$|\.p12$|\.netrc|credentials)/i;
const GUTTER = /^(\s*(?:[│┃|]|└|├|⎿|>|•|⏺)\s?)+/u;
const PATHCH = /[A-Za-z0-9._@%+~$/-]/;

const per = new Map();
let httpUrls = 0;

for (const sid of sessions) {
  let agent = '';
  try {
    agent = tmux('show-options', '-t', sid).split('\n').find((l) => l.startsWith('@gmux-agent '))?.slice(12).trim() ?? '';
  } catch { agent = ''; }
  if (agent === '') continue;                       // not ours: never adopt it
  let width = 80;
  try { width = Number(tmux('list-panes', '-t', sid, '-F', '#{pane_width}').trim().split('\n')[0]); } catch { /* keep 80 */ }
  let text = '';
  try { text = tmux('capture-pane', '-p', '-S', '-', '-t', sid); } catch { continue; }
  const rows = text.split('\n').map((r) => r.replace(/\s+$/, ''));

  const p = per.get(agent) ?? {
    sessions: 0, rows: 0, a: 0, b: 0, abs: 0, rel: 0, deco: 0,
    offered: 0, endOfRow: 0, endOfRowContinues: 0, headOfRow: 0,
    tilde: 0, fileUrl: 0, lineNo: 0, agreeA: 0,
    image: 0, markdown: 0, dir: 0, file: 0, link: 0, missing: 0, foreign: 0, secretish: 0
  };
  p.sessions++; p.rows += rows.length;
  per.set(agent, p);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const next = rows[i + 1] ?? '';
    for (const _ of row.matchAll(/https?:\/\/\S+/g)) httpUrls++;
    p.a += spansA(row).length;
    for (const t of tokenizeB(row)) {
      if (!looksPathB(t.text)) continue;
      p.b++;
      const { path, deco } = normalise(t.text);
      if (deco.length > 0) p.deco++;
      if (deco.includes('~')) p.tilde++;
      if (deco.includes('file://')) p.fileUrl++;
      if (deco.includes('line') || deco.includes('line:col')) p.lineNo++;
      const ext = extname(path).toLowerCase();
      if (IMG.has(ext)) p.image++;
      if (MD.has(ext)) p.markdown++;
      if (SECRETISH.test(path)) p.secretish++;
      if (!path.startsWith('/')) { p.rel++; continue; }
      p.abs++;
      if (/^\/(root|home|workspace|app)\//.test(path)) p.foreign++;
      const kind = checkedLstat(path);
      if (kind === 'dir') p.dir++;
      else if (kind === 'file') p.file++;
      else if (kind === 'link') p.link++;
      else if (kind === 'missing') { p.missing++; continue; }
      if (kind === null || kind === 'missing') continue;
      p.offered++;
      if (t.end === row.length) {
        p.endOfRow++;
        const cont = next.replace(GUTTER, '');
        if (cont.length > 0 && PATHCH.test(cont[0])) p.endOfRowContinues++;
      }
      const head = row.replace(GUTTER, '');
      if (t.start === row.length - head.length && i > 0) {
        const prev = rows[i - 1];
        if (prev.length > 0 && PATHCH.test(prev[prev.length - 1])) p.headOfRow++;
      }
    }
  }
}

const sum = (k) => [...per.values()].reduce((n, v) => n + v[k], 0);
say(`corpus: ${String(sum('sessions'))} sessions, ${String(sum('rows'))} physical rows, ${String(per.size)} agents (${[...per.keys()].sort().join(', ')})`);
say(`http(s) URLs, which are ALREADY clickable: ${String(httpUrls)}`);
console.log('');
console.log(
  ['agent', 'sessions', 'rows', 'A spans', 'B spans', 'absolute', 'relative', 'decorated', 'offered', 'end-of-row', '…continues', 'head-of-row', '~', 'file://', ':line', 'image', 'markdown', 'dir', 'file', 'link', 'gone', 'foreign root', 'credential-ish'].join('\t')
);
for (const [agent, v] of [...per.entries()].sort()) {
  console.log([agent, v.sessions, v.rows, v.a, v.b, v.abs, v.rel, v.deco, v.offered, v.endOfRow, v.endOfRowContinues, v.headOfRow, v.tilde, v.fileUrl, v.lineNo, v.image, v.markdown, v.dir, v.file, v.link, v.missing, v.foreign, v.secretish].join('\t'));
}
console.log('');
const B = sum('b'), OFF = sum('offered'), CONT = sum('endOfRowContinues');
say(`detector B judged ${String(B)} tokens path-shaped; the conservative policy offers ${String(OFF)} of them (${(100 * OFF / B).toFixed(1)}%)`);
say(`of the offered spans, ${String(CONT)} (${(100 * CONT / OFF).toFixed(1)}%) end at a row boundary the next row continues, so the span is a PREFIX of the real reference`);
say(`absolute candidates that are not there: ${String(sum('missing'))} of ${String(sum('abs'))} (${(100 * sum('missing') / sum('abs')).toFixed(1)}%)`);
}
