#!/usr/bin/env node
/**
 * PHASE 247, THE MEASURE STEP. WHAT DOES WIDENING THE ROOT RULE COST, WHAT
 * KINDS ARE REALLY IN A TRANSCRIPT, AND WHAT WOULD LIFTING REFUSAL 8 COST?
 *
 * Research 107 measured the offer set with the project root rule ON. The
 * operator lifted that rule's default on 2026-09-09 and asked for the
 * measurement to come with it. This script is that measurement, and it takes
 * ONE capture and answers every question off it, so the three answers are
 * about the same corpus rather than three captures minutes apart.
 *
 * It LISTS and CAPTURES the operator's own sessions and does nothing else: it
 * never attaches, never sends a key, never kills a session, never starts an
 * agent and spends no token. A session with no `@gmux-agent` option is not
 * ours and is skipped.
 *
 * THE ONLY FILESYSTEM CALLS ANYWHERE ARE `lstat`, `stat` AND `realpath`, all
 * metadata only. NO PATH READ OUT OF A TRANSCRIPT IS EVER OPENED, EXECUTED,
 * FOLLOWED INTO OR WRITTEN TO. `/net/` and `/Volumes/` are refused before any
 * call, because a stale automount can hang the process, and they are counted
 * so the refusal is visible rather than silent.
 *
 * IT PRINTS COUNTS, RATES AND SHAPES AND NEVER A PATH. The one exception is
 * `--sample`, which prints spans with context for a HAND ADJUDICATION and is
 * off by default; its output is a working reading and never goes into a
 * document, a fixture or a commit.
 *
 *   P247_ROOTS=/a:/b node build/p247/offer-cost.mjs      the three measurements
 *   node build/p247/offer-cost.mjs --self-test           prove the predicates
 *   node build/p247/offer-cost.mjs --fixtures            prove the door sequence
 *   P247_ROOTS=… node build/p247/offer-cost.mjs --sample 150 --seed 247
 */

import { execFileSync } from 'node:child_process';
import {
  chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync,
  rmSync, statSync, symlinkSync, writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { looksPathB, normalise, tokenizeB } from '../p245/corpus-scan.mjs';

const TAG = '[p247]';
const say = (l) => console.log(`${TAG} ${l}`);
const pct = (n, d) => (d === 0 ? '0.0' : ((100 * n) / d).toFixed(1));

// ---------------------------------------------------------------------------
// THE SHIPPED PREDICATES, read out of the source so this cannot drift.
//
// research 107's `build/p245/root-cost.mjs` RESTATED the NEVER_PREVIEW rules by
// hand and its restatement is already three extensions short of the shipped
// list (`.asc`, `.gpg`, `.ppk`). So the sets are parsed here, and the self test
// asserts the parsed predicate refuses every `examples` entry the shipped rules
// carry — which is the check that catches the next divergence too.
// ---------------------------------------------------------------------------
const PREVIEW_SRC = 'src/shared/preview-types.ts';
const IMAGE_SRC = 'src/shared/image-types.ts';

function listFromSource(src, name) {
  const m = new RegExp(`${name}[^=]*=\\s*(?:new Set\\()?\\[([\\s\\S]*?)\\]`).exec(src);
  if (m === null) throw new Error(`${name} not found`);
  return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
}

function shippedSets() {
  const src = readFileSync(PREVIEW_SRC, 'utf8');
  const keyExt = new Set(listFromSource(src, 'KEY_MATERIAL_EXTENSIONS'));
  const sshStems = listFromSource(src, 'SSH_KEY_STEMS');
  const examples = [...src.matchAll(/examples:\s*\[([^\]]*)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
  const img = readFileSync(IMAGE_SRC, 'utf8');
  const block = /IMAGE_MEDIA_TYPES[^=]*=\s*\{([\s\S]*?)\n\};/.exec(img);
  if (block === null) throw new Error('IMAGE_MEDIA_TYPES not found');
  const imageExt = new Set([...block[1].matchAll(/'(\.[a-z0-9]+)'\s*:/g)].map((m) => m[1]));
  if (keyExt.size === 0 || sshStems.length === 0 || imageExt.size === 0) {
    throw new Error('a shipped set parsed empty');
  }
  return { keyExt, sshStems, imageExt, examples };
}

const SETS = shippedSets();

/** `looksLikeSecretPath` from src/shared/preview-types.ts, name only. */
export function looksLikeSecretName(path) {
  const name = basename(path).toLowerCase();
  if (name === '.env' || name.startsWith('.env.')) return true;
  if (SETS.keyExt.has(extname(name))) return true;
  if (SETS.sshStems.some((s) => name === s || name.startsWith(`${s}.`))) return true;
  if (extname(name) === '.properties') return true;
  if (name === '.netrc' || name === '_netrc') return true;
  if (name === '.htpasswd' || name === 'htpasswd') return true;
  return false;
}

/** Containment with a separator, exactly as src/main/fs/paths.ts spells it. */
export function containedIn(root, candidate) {
  if (candidate === root) return true;
  return candidate.startsWith(root.endsWith(sep) ? root : root + sep);
}

// ---------------------------------------------------------------------------
// Resolution. lstat, then realpath, then stat. Metadata only, never an open.
// ---------------------------------------------------------------------------
const MOUNT_REFUSED = [/^\/Volumes\//, /^\/net\//];
const cache = new Map();
let mountsRefused = 0;

/**
 * What is really at this spelling: the realpath, the kind of the TARGET, and
 * whether the target carries any executable bit. `null` when the spelling was
 * refused before any call was made.
 */
export function resolveSpan(p) {
  if (typeof p !== 'string' || !p.startsWith('/') || p.length > 1024) return null;
  for (const r of MOUNT_REFUSED) if (r.test(p)) { mountsRefused++; return null; }
  if (cache.has(p)) return cache.get(p);
  let answer;
  try {
    const l = lstatSync(p);
    const isLink = l.isSymbolicLink();
    let real = p;
    try { real = realpathSync(p); } catch { real = null; }
    if (real === null) answer = { kind: 'missing', real: p, isLink, exec: false, mode: 0 };
    else {
      const st = statSync(real);
      const kind = st.isDirectory() ? 'dir' : st.isFile() ? 'file' : 'other';
      answer = { kind, real, isLink, exec: (st.mode & 0o111) !== 0, mode: st.mode & 0o7777 };
    }
  } catch {
    answer = { kind: 'missing', real: p, isLink: false, exec: false, mode: 0 };
  }
  cache.set(p, answer);
  return answer;
}

/** A macOS bundle: a DIRECTORY carrying an extension, or one with Info.plist. */
export function looksLikeBundle(real, kind) {
  if (kind !== 'dir') return false;
  if (extname(real) !== '') return true;
  try { return statSync(join(real, 'Contents', 'Info.plist')).isFile(); } catch { return false; }
}

// ---------------------------------------------------------------------------
// Rows. The gutter a program draws on its own continuation row, and the
// characters a path can be spelled with.
// ---------------------------------------------------------------------------
const GUTTER = /^(\s*(?:[│┃|]|└|├|⎿|>|•|⏺)\s?)+/u;
const PATHCH = /[A-Za-z0-9._@%+~$/-]/;

// ---------------------------------------------------------------------------
// Self test.
// ---------------------------------------------------------------------------
function selfTest() {
  let bad = 0;
  const check = (ok, why) => { if (!ok) bad++; console.log(`${TAG} ${ok ? 'OK  ' : 'FAIL'} ${why}`); };
  for (const ex of SETS.examples) {
    check(looksLikeSecretName(ex) === true, `the shipped NEVER_PREVIEW example ${JSON.stringify(ex)} is refused`);
  }
  check(SETS.keyExt.has('.ppk'), '.ppk parsed out of the shipped KEY_MATERIAL_EXTENSIONS (p245 restated the list without it)');
  check(SETS.keyExt.has('.asc') && SETS.keyExt.has('.gpg'), '.asc and .gpg parsed too');
  check(looksLikeSecretName('/a/b/auth.json') === false, 'auth.json is NOT on the shipped list — stated, not assumed');
  check(looksLikeSecretName('/a/b/README.md') === false, 'an ordinary file is not a secret');
  check(SETS.imageExt.has('.png') && !SETS.imageExt.has('.tiff'), 'the shipped image list parsed, TIFF deliberately absent');
  check(SETS.imageExt.has('.pdf') === false, 'PDF is not an image extension: Tortie has no surface that draws one');
  check(containedIn('/a/b', '/a/b/c') && !containedIn('/a/b', '/a/b-old/c'), 'containment needs a separator');
  const r = resolveSpan('/private/tmp/definitely-not-here-p247');
  check(r !== null && r.kind === 'missing', 'a path that is not there answers missing');
  check(resolveSpan('/net/anything') === null, 'a network mount is refused before any call');
  console.log(`${TAG} ${bad === 0 ? 'every fixture behaved' : `${String(bad)} fixtures did not`}`);
  return bad === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// The door fixtures. The hostile shapes, asked of the SEQUENCE this document
// proposes, over files this script makes itself in a scratch directory it
// removes in a `finally`. Nothing here is ever opened or executed: the answers
// are lstat, realpath and stat, and a refusal is a word.
// ---------------------------------------------------------------------------
const EXTERNAL_ALLOW = new Set(['.pdf']);          // the proposed closed set

/**
 * Names that hold a credential and that the SHIPPED `looksLikeSecretPath` does
 * NOT name. research 107 section 8.1 states `auth.json` as a gap; this counts
 * the whole family so the gap is a number rather than one example.
 */
const CREDENTIAL_SHAPED = /^(auth\.json|credentials(\.json)?|\.credentials\.json|token\.json|tokens\.json|\.npmrc|\.pypirc|\.dockercfg|config\.json)$/i;

/** The sequence, in order. Answers the door or the refusal word. */
export function door(spelling, imageExt = SETS.imageExt) {
  if (!spelling.startsWith('/')) return 'refused:not-absolute';
  if (/[\r\n]/.test(spelling)) return 'refused:control-character';
  const r = resolveSpan(spelling);
  if (r === null) return 'refused:mount';
  if (r.kind === 'missing') return 'refused:missing';
  if (looksLikeBundle(r.real, r.kind)) return 'refused:bundle';
  if (r.kind !== 'file') return 'refused:not-a-regular-file';
  if (looksLikeSecretName(r.real)) return 'refused:secret-name';
  if (r.exec) return 'refused:executable-bit';
  const ext = extname(r.real).toLowerCase();
  if (imageExt.has(ext)) return 'tortie:image';
  if (EXTERNAL_ALLOW.has(ext)) return 'mac:openPath';
  return 'tortie:editor';
}

function fixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'p247-doors-'));
  let bad = 0;
  const check = (got, want, why) => {
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${TAG} ${ok ? 'OK  ' : 'FAIL'} ${String(got).padEnd(28)} — ${why}`);
  };
  try {
    const f = (name, body, mode) => {
      const p = join(dir, name);
      writeFileSync(p, body ?? 'x');
      if (mode !== undefined) chmodSync(p, mode);
      return p;
    };
    check(door(f('a.png', 'not really a png')), 'tortie:image',
      'a .png that is really a shell script still goes to TORTIE, which draws bytes and runs nothing');
    check(door(f('run.png', '#!/bin/sh\necho hi\n', 0o755)), 'refused:executable-bit',
      'a .png carrying the executable bit is refused by MODE before its extension is read');
    check(door(f('paper.pdf', 'x', 0o755)), 'refused:executable-bit',
      'a .pdf with the executable bit is refused, so the allowlist never sees it');
    check(door(f('paper2.pdf')), 'mac:openPath', 'an ordinary .pdf is the one kind that leaves Tortie');
    check(door(f('go.command', '#!/bin/sh\n', 0o755)), 'refused:executable-bit',
      'a .command is refused by mode, and by not being on the allowlist under it');
    check(door(f('go2.command', '#!/bin/sh\n', 0o644)), 'tortie:editor',
      'a .command with NO executable bit is not handed out either: it is not on the allowlist, so it opens as text in Tortie');
    const bundle = join(dir, 'shot.png');
    mkdirSync(join(bundle, 'Contents'), { recursive: true });
    writeFileSync(join(bundle, 'Contents', 'Info.plist'), '<plist/>');
    check(door(bundle), 'refused:bundle',
      'a BUNDLE DIRECTORY wearing a .png suffix is refused as a bundle, and would be refused as a directory under it');
    const app = join(dir, 'Thing.app');
    mkdirSync(join(app, 'Contents', 'MacOS'), { recursive: true });
    writeFileSync(join(app, 'Contents', 'MacOS', 'Thing'), '#!/bin/sh\n');
    chmodSync(join(app, 'Contents', 'MacOS', 'Thing'), 0o755);
    check(door(app), 'refused:bundle', 'an .app is a directory and never reaches a door');
    symlinkSync(app, join(dir, 'pic.png'));
    check(door(join(dir, 'pic.png')), 'refused:bundle',
      'a symlink spelled .png whose LEAF resolves to a bundle is refused, because every question is asked of the realpath');
    symlinkSync(f('secret.pem', 'k'), join(dir, 'notes.md'));
    check(door(join(dir, 'notes.md')), 'refused:secret-name',
      'a symlink spelled .md whose leaf is key material is refused by the realpath NAME, not the spelling');
    check(door(f('auth.json', '{}')), 'tortie:editor',
      'auth.json is NOT refused by the shipped predicate — the gap research 107 stated, reproduced here');
    check(door(`${dir}/a.png\n/etc/passwd`), 'refused:control-character',
      'a newline in the spelling is refused before any filesystem call');
    check(door(f('lib.dylib', 'x', 0o755)), 'refused:executable-bit', 'a Mach-O carries the bit');
    check(door('/usr/bin/env'), 'refused:executable-bit',
      'the shebang family every transcript is full of is refused by mode');
    check(door('/etc/hosts'), 'tortie:editor',
      'a system text file is NOT refused by any of these rules — it opens read-only in Tortie, and that is the widening');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  console.log(`${TAG} ${bad === 0 ? 'every door fixture behaved' : `${String(bad)} door fixtures did not`}`);
  return bad === 0 ? 0 : 1;
}

// ---------------------------------------------------------------------------
// The corpus. LIST and CAPTURE only. Two captures per session: the plain one
// the provider would see, and tmux's own `-J` join, which is the ORACLE for
// which rows really continue.
// ---------------------------------------------------------------------------
function capture() {
  const tmux = (...a) =>
    execFileSync('tmux', ['-L', 'gmux', ...a], { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 });
  let sessions;
  try {
    sessions = tmux('list-sessions', '-F', '#{session_id}').trim().split('\n').filter(Boolean);
  } catch {
    console.error(`${TAG} no sessions on -L gmux. Nothing to measure.`);
    process.exit(2);
  }
  const panes = [];
  for (const sid of sessions) {
    let agent = '';
    try {
      agent = tmux('show-options', '-t', sid).split('\n')
        .find((l) => l.startsWith('@gmux-agent '))?.slice(12).trim() ?? '';
    } catch { agent = ''; }
    if (agent === '') continue;                      // not ours: never adopt it
    let width = 80;
    try { width = Number(tmux('list-panes', '-t', sid, '-F', '#{pane_width}').trim().split('\n')[0]); } catch { /* keep */ }
    let plain = '', joined = '';
    // `-N` preserves the trailing spaces `-J` also preserves, which is what
    // makes the two captures alignable character for character. The rows the
    // detectors read are still the trimmed ones, because that is what research
    // 107 read and what a person sees.
    try { plain = tmux('capture-pane', '-p', '-N', '-S', '-', '-t', sid); } catch { continue; }
    try { joined = tmux('capture-pane', '-p', '-J', '-S', '-', '-t', sid); } catch { joined = ''; }
    const raw = plain.split('\n');
    panes.push({
      agent,
      width,
      raw,
      rows: raw.map((r) => r.replace(/\s+$/, '')),
      joined: joined.split('\n')
    });
  }
  return panes;
}

/**
 * THE WRAP ORACLE, and it is tmux's own answer rather than a model of one.
 *
 * `capture-pane -J` joins the rows tmux believes were wrapped. So a candidate
 * rejoin — this row's span glued to the next row's leading path run — really is
 * one line if and only if the joined capture holds that string unbroken. It is
 * asked as a substring of the joined TEXT rather than by row index, because the
 * two captures do NOT align by index on a long pane: `-J` returns fewer lines
 * and the offset it loses is not recoverable by walking, which
 * `continuedRows` below measures and reports rather than hides.
 */
export function continuedRows(raw, joined) {
  const rt = (x) => x.replace(/\s+$/, '');
  const cont = new Set();
  let i = 0;
  for (const line of joined) {
    if (i >= raw.length) break;
    const start = i;
    let acc = raw[i];
    while (rt(acc) !== rt(line) && acc.length < line.length && i + 1 < raw.length && line.startsWith(acc)) {
      i++;
      acc += raw[i];
    }
    if (rt(acc) !== rt(line)) return null;            // alignment lost: say so
    for (let k = start; k < i; k++) cont.add(k);
    i++;
  }
  return cont;
}

// ---------------------------------------------------------------------------
// The run.
// ---------------------------------------------------------------------------
function run(sampleN, seed) {
  const roots = (process.env['P247_ROOTS'] ?? '').split(':').filter((r) => r.length > 0)
    .map((r) => { try { return realpathSync(r); } catch { return null; } })
    .filter((r) => r !== null);
  if (roots.length === 0) {
    console.error(`${TAG} P247_ROOTS is required (colon separated absolute project roots).`);
    process.exit(2);
  }
  const inAnyRoot = (abs) => roots.some((r) => containedIn(r, abs));

  const panes = capture();
  const rj = {
    edgeToken: 0, edgeColumn: 0, edgeTokenOnly: 0,
    oracleEdgeColumn: 0, oracleEdgeTokenOnly: 0,
    headIsFile: 0, headIsDir: 0, headMissing: 0,
    glueFile: 0, glueDir: 0, glueMissing: 0,
    gainFile: 0, lieOffered: 0, lieRejoin: 0, glueExists: 0, glueExistsWrapped: 0,
    lieHeadDir: 0, lieHeadFile: 0, lieHeadMissing: 0, tightRefused: 0, tightRefusedFile: 0,
    fullRows: 0, fullRowsContinued: 0, rowsTotal: 0,
    perAgent: new Map()
  };
  const c = {
    sessions: panes.length, rows: 0, shaped: 0, relative: 0, absolute: 0,
    bareRoot: 0, missing: 0, mounts: 0,
    dir: 0, file: 0, other: 0, link: 0,
    offeredNarrow: 0, offeredWide: 0,
    wideEdge: 0, wideEdgeContinues: 0, wideHead: 0,
    wideKept: 0, wideKeptInRoot: 0, wideKeptOutRoot: 0, keptNo8: 0, keptNo8Edge: 0,
    exec: 0, secret: 0, bundle: 0, linkOutOfRoot: 0,
    doors: new Map(), exts: new Map(), outExts: new Map(),
    allExts: new Map(), goneExts: new Map(), credGap: 0, credGapNames: new Map(),
    doorExts: new Map(), doorNoExt: 0, doorPaths: new Map(),
    distinctWide: new Set(), distinctNarrow: new Set(),
    foreignRoot: 0, tmpFamily: 0, systemFamily: 0, homeDotFamily: 0
  };
  const perAgent = new Map();
  const sample = [];
  let sampleSeen = 0;
  // A seeded reservoir so the sample is reproducible and drawn over the whole
  // corpus rather than over whatever scrolled first.
  let s = seed >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const bump = (m, k) => m.set(k, (m.get(k) ?? 0) + 1);

  for (const pane of panes) {
    const { rows, joined, agent } = pane;
    c.rows += rows.length;
    const joinedText = joined.join('\n');
    // Is row i and row i+1 ONE line, per tmux? Asked of the two ROWS rather
    // than of the glued span, because a span glued to its continuation can
    // appear anywhere else in the pane — the same path printed whole on
    // another line answers yes to a span-level substring test and means
    // nothing. The row's own full-width text is what makes the probe specific.
    const oneLineMemo = new Map();
    const rowsAreOneLine = (i) => {
      if (oneLineMemo.has(i)) return oneLineMemo.get(i);
      const a = pane.raw[i] ?? '';
      const b = pane.raw[i + 1] ?? '';
      const probe = a + b.slice(0, Math.min(20, b.length));
      const answer = a.length > 0 && b.length > 0 && joinedText.includes(probe);
      oneLineMemo.set(i, answer);
      return answer;
    };
    const cont = joined.length > 1 ? continuedRows(pane.raw, joined) : null;
    const width = pane.width;
    const ra = rj.perAgent.get(agent) ?? { edge: 0, oracle: 0, gain: 0, lie: 0, wrappedRows: 0, rows: 0, full: 0, fullCont: 0, ge: 0, gew: 0 };
    ra.rows += rows.length;
    ra.wrappedRows += Math.max(0, pane.raw.length - joined.length);
    rj.perAgent.set(agent, ra);
    const pa = perAgent.get(agent) ?? { panes: 0, rows: 0, shaped: 0, narrow: 0, wide: 0, kept: 0, aligned: 0 };
    pa.panes++; pa.rows += rows.length;
    if (cont !== null) pa.aligned++;
    perAgent.set(agent, pa);

    for (let i = 0; i < rows.length; i++) {
      if ((pane.raw[i] ?? '').length >= width) {
        rj.fullRows++; ra.full++;
        if (rowsAreOneLine(i)) { rj.fullRowsContinued++; ra.fullCont++; }
      }
      rj.rowsTotal++;
      const row = rows[i];
      const next = rows[i + 1] ?? '';
      const head = row.replace(GUTTER, '');
      const headAt = row.length - head.length;
      for (const t of tokenizeB(row)) {
        if (!looksPathB(t.text)) continue;
        c.shaped++; pa.shaped++;
        const { path } = normalise(t.text);
        // The extension census over EVERY path-shaped token, whatever it is and
        // whether or not it is there: the kind allowlist has to be argued from
        // what a transcript really names, not from what happens to resolve.
        bump(c.allExts, extname(path).toLowerCase() || '(none)');
        if (!path.startsWith('/')) { c.relative++; continue; }
        if (path.split('/').filter((x) => x.length > 0).length === 0) { c.bareRoot++; continue; }
        c.absolute++;
        const r = resolveSpan(path);
        if (r === null) { c.mounts++; continue; }

        // REFUSAL 8's accounting, over every absolute candidate whether or not
        // it is there: the commonest wrap shape is a truncated head that names
        // nothing at all, and it is invisible from inside the existence check.
        if (t.end === row.length) {
          rj.edgeToken++; ra.edge++;
          const atColumn = t.end >= width;
          if (atColumn) rj.edgeColumn++; else rj.edgeTokenOnly++;
          const contTxt = next.replace(GUTTER, '');
          const run = /^[A-Za-z0-9._@%+~$/-]+/.exec(contTxt);
          const glue = run === null ? null : t.text + run[0];
          const reallyWrapped = rowsAreOneLine(i);
          if (reallyWrapped) {
            ra.oracle++;
            if (atColumn) rj.oracleEdgeColumn++; else rj.oracleEdgeTokenOnly++;
          }
          const hk = r.kind;
          if (hk === 'file') rj.headIsFile++; else if (hk === 'dir') rj.headIsDir++; else rj.headMissing++;
          if (glue !== null) {
            const g = resolveSpan(normalise(glue).path);
            const gk = g === null ? 'missing' : g.kind;
            if (gk === 'file') rj.glueFile++; else if (gk === 'dir') rj.glueDir++; else rj.glueMissing++;
            if (gk === 'file' && hk !== 'file') { rj.gainFile++; ra.gain++; }
            if (reallyWrapped && hk !== 'missing') rj.lieOffered++;
            if (gk !== 'missing') {
              rj.glueExists++; ra.ge++;
              if (reallyWrapped) { rj.glueExistsWrapped++; ra.gew++; }
              else {
                rj.lieRejoin++; ra.lie++;
                if (hk === 'dir') rj.lieHeadDir++; else if (hk === 'file') rj.lieHeadFile++; else rj.lieHeadMissing++;
              }
            }
          } else if (reallyWrapped) { /* unreachable: no run, no glue */ }
        }

        if (r.kind === 'missing') {
          c.missing++;
          bump(c.goneExts, extname(path).toLowerCase() || '(none)');
          continue;
        }
        if (r.isLink) c.link++;
        if (r.kind === 'dir') c.dir++; else if (r.kind === 'file') c.file++; else c.other++;

        // The DETECTION rule's offer, which is where research 107's 1,293 comes
        // from: absolute, one segment, something is there.
        const inRootSpelling = inAnyRoot(path);
        const inRootReal = inAnyRoot(r.real);
        if (inRootReal) c.offeredNarrow++;
        c.offeredWide++;

        const atRightEdge = t.end === row.length;
        const atHead = t.start === headAt && i > 0 &&
          rows[i - 1].length > 0 && PATHCH.test(rows[i - 1][rows[i - 1].length - 1]);
        if (atRightEdge) {
          c.wideEdge++;
          const contTxt = next.replace(GUTTER, '');
          if (contTxt.length > 0 && PATHCH.test(contTxt[0])) c.wideEdgeContinues++;
        }
        if (atHead) c.wideHead++;

        // VERSION TWO as this phase would ship it: refusal 8 still stands, a
        // directory is never a link, the realpath answers every question.
        const tightEdge = t.end >= width ||
          (t.start === headAt && i > 0 && (pane.raw[i - 1] ?? '').length >= width);
        if (r.kind === 'file') {
          c.keptNo8++;
          if (atRightEdge || atHead) c.keptNo8Edge++;
          if (tightEdge) rj.tightRefusedFile++;
        }
        if (tightEdge) rj.tightRefused++;
        if (atRightEdge || atHead) continue;
        if (r.kind !== 'file') continue;
        c.wideKept++;
        if (inRootReal) { c.wideKeptInRoot++; c.distinctNarrow.add(r.real); }
        else c.wideKeptOutRoot++;
        c.distinctWide.add(r.real);
        if (r.isLink && inRootSpelling && !inRootReal) c.linkOutOfRoot++;
        if (r.exec) c.exec++;
        if (looksLikeSecretName(r.real)) c.secret++;
        else if (CREDENTIAL_SHAPED.test(basename(r.real))) {
          c.credGap++;
          bump(c.credGapNames, basename(r.real));
        }
        const ext = extname(r.real).toLowerCase() || '(none)';
        bump(c.exts, ext);
        if (!inRootReal) bump(c.outExts, ext);
        bump(c.doors, `${door(path)}	${inRootReal ? 'in-root' : 'out-of-root'}`);
        if (/^\/(root|home|workspace|app)\//.test(path)) c.foreignRoot++;
        if (/^\/(private\/)?(tmp|var)\//.test(r.real)) c.tmpFamily++;
        if (/^\/(usr|bin|sbin|etc|System|Library|Applications|opt)\//.test(r.real)) c.systemFamily++;
        if (/^\/Users\/[^/]+\/\./.test(r.real)) c.homeDotFamily++;
        pa.kept++;

        const answered = door(path);
        if (!answered.startsWith('refused')) {
          bump(c.doorExts, ext);
          bump(c.doorPaths, `${answered}	${inRootReal ? 'in ' : 'out'}	${r.real}`);
          if (ext === '(none)') c.doorNoExt++;
        }
        if (sampleN > 0 && !answered.startsWith('refused')) {
          sampleSeen++;
          const rec = {
            agent,
            door: answered,
            inRoot: inRootReal,
            ext,
            text: t.text,
            leaf: basename(r.real),
            depth: r.real.split('/').length - 1,
            context: row.slice(Math.max(0, t.start - 22), t.start)
          };
          if (sample.length < sampleN) sample.push(rec);
          else {
            const j = Math.floor(rnd() * sampleSeen);
            if (j < sampleN) sample[j] = rec;
          }
        }
      }
    }
  }

  console.log('');
  say(`corpus: ${String(c.sessions)} panes, ${String(c.rows)} physical rows, roots handed in: ${String(roots.length)}`);
  say(`path-shaped tokens: ${String(c.shaped)} — relative ${String(c.relative)} (${pct(c.relative, c.shaped)}%), absolute ${String(c.absolute)}, bare root ${String(c.bareRoot)}`);
  say(`absolute candidates: not there ${String(c.missing)} (${pct(c.missing, c.absolute)}%), on a refused mount ${String(c.mounts)}`);
  say(`what is really there — dir ${String(c.dir)}, file ${String(c.file)}, other ${String(c.other)}, of which symlinks ${String(c.link)}`);
  console.log('');
  say(`THE DETECTION RULE's offer (absolute, one segment, something is there): ${String(c.offeredWide)}`);
  say(`  of those, inside an open local project root by REALPATH: ${String(c.offeredNarrow)} (${pct(c.offeredNarrow, c.offeredWide)}%)`);
  say(`  outside every root, which is what the widening admits: ${String(c.offeredWide - c.offeredNarrow)} (${pct(c.offeredWide - c.offeredNarrow, c.offeredWide)}%)`);
  say(`  touching a row's right edge: ${String(c.wideEdge)} (${pct(c.wideEdge, c.offeredWide)}%), of which the next row continues with a path character: ${String(c.wideEdgeContinues)} (${pct(c.wideEdgeContinues, c.offeredWide)}%)`);
  say(`  starting at a row's head after a row that ends in a path character: ${String(c.wideHead)} (${pct(c.wideHead, c.offeredWide)}%)`);
  console.log('');
  say(`VERSION TWO's offer (refusal 8 kept, a directory is never a link, every question asked of the realpath): ${String(c.wideKept)}`);
  say(`  inside a root ${String(c.wideKeptInRoot)} (${pct(c.wideKeptInRoot, c.wideKept)}%), outside every root ${String(c.wideKeptOutRoot)} (${pct(c.wideKeptOutRoot, c.wideKept)}%)`);
  say(`  what refusal 8 costs: file spans it refuses for touching an edge: ${String(c.keptNo8Edge)} of ${String(c.keptNo8)} (${pct(c.keptNo8Edge, c.keptNo8)}%)`);
  say(`  distinct files behind them: ${String(c.distinctWide.size)}, of which inside a root: ${String(c.distinctNarrow.size)}`);
  say(`  carrying an executable bit: ${String(c.exec)}; matching the shipped NEVER_PREVIEW list: ${String(c.secret)}`);
  say(`  a symlink spelled inside a root whose leaf is outside every root: ${String(c.linkOutOfRoot)}`);
  say(`  families — under /tmp or /var ${String(c.tmpFamily)}, under a system root ${String(c.systemFamily)}, under a dotfolder in a home ${String(c.homeDotFamily)}, under a foreign root ${String(c.foreignRoot)}`);
  console.log('');
  say('THE DOORS');
  for (const [k, v] of [...c.doors.entries()].sort((a, b) => b[1] - a[1])) {
    const [d, where] = k.split('\t');
    say(`  ${d.padEnd(26)} ${where.padEnd(12)} ${String(v).padStart(5)} (${pct(v, c.wideKept)}%)`);
  }
  say(`  names holding a credential that the SHIPPED predicate does not refuse: ${String(c.credGap)} — ${[...c.credGapNames.entries()].map(([k, v]) => `${k} x${String(v)}`).join(', ') || 'none'}`);
  console.log('');
  say('EXTENSIONS over EVERY path-shaped token, which is what a transcript NAMES (count, and how many of the absolute ones are not there)');
  for (const [k, v] of [...c.allExts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24)) {
    say(`  ${k.padEnd(14)} ${String(v).padStart(5)}   gone: ${String(c.goneExts.get(k) ?? 0).padStart(4)}`);
  }
  console.log('');
  say('EXTENSIONS of the file spans version two keeps (count, and how many are outside every root)');
  for (const [k, v] of [...c.exts.entries()].sort((a, b) => b[1] - a[1])) {
    say(`  ${k.padEnd(14)} ${String(v).padStart(5)}   outside: ${String(c.outExts.get(k) ?? 0).padStart(4)}`);
  }
  console.log('');
  say('EXTENSIONS of the spans that REACH A DOOR — this is the set the kind allowlist must be argued from');
  for (const [k, v] of [...c.doorExts.entries()].sort((a, b) => b[1] - a[1])) {
    say(`  ${k.padEnd(14)} ${String(v).padStart(5)}`);
  }
  console.log('');
  say('PER AGENT');
  for (const [a, v] of [...perAgent.entries()].sort()) {
    say(`  ${a.padEnd(8)} panes ${String(v.panes).padStart(3)}  rows ${String(v.rows).padStart(6)}  shaped ${String(v.shaped).padStart(5)}  version two keeps ${String(v.kept).padStart(4)}  panes tmux -J aligned: ${String(v.aligned)}/${String(v.panes)}`);
  }
  say(`mount spellings refused before any call: ${String(mountsRefused)}`);

  console.log('');
  say('REFUSAL 8 — WHAT A REJOIN WOULD COST (absolute spans that end their row)');
  say(`  spans that are the LAST TOKEN on their row: ${String(rj.edgeToken)}`);
  say(`    …of which reach the pane's last COLUMN, which is the only shape a terminal wrap can take: ${String(rj.edgeColumn)}`);
  say(`    …of which stop short of it, so the row simply ended there: ${String(rj.edgeTokenOnly)}`);
  say(`  tmux's own -J oracle says the glue really is one line:`);
  say(`    of the ${String(rj.edgeColumn)} at the last column: ${String(rj.oracleEdgeColumn)} (${pct(rj.oracleEdgeColumn, rj.edgeColumn)}%)`);
  say(`    of the ${String(rj.edgeTokenOnly)} that stop short: ${String(rj.oracleEdgeTokenOnly)} (${pct(rj.oracleEdgeTokenOnly, rj.edgeTokenOnly)}%)`);
  say(`  what the span itself is — a file ${String(rj.headIsFile)}, a directory ${String(rj.headIsDir)}, not there ${String(rj.headMissing)}`);
  say(`  what a BLIND GLUE with the next row's leading path run produces — a file ${String(rj.glueFile)}, a directory ${String(rj.glueDir)}, not there ${String(rj.glueMissing)}`);
  say(`  the GAIN: glue is a file where the span alone was not: ${String(rj.gainFile)}`);
  say(`  what refusal 8 is buying: the span really is there AND the oracle says it is truncated, so a click would open the WRONG thing: ${String(rj.lieOffered)}`);
  say(`  the lies by what the SPAN itself was — a directory ${String(rj.lieHeadDir)}, a file ${String(rj.lieHeadFile)}, not there ${String(rj.lieHeadMissing)}`);
  say(`  REFUSAL 8 SPELLED TIGHTLY (only a span that reaches the pane's last column, or starts a row whose predecessor filled its own): it would refuse ${String(rj.tightRefusedFile)} file spans against the shipped spelling's ${String(c.keptNo8Edge)}`);
  say(`  what a blind rejoin would COST: the glue names something that EXISTS while the oracle says the two rows are NOT one line: ${String(rj.lieRejoin)} of the ${String(rj.glueExists)} glues that resolve at all (${pct(rj.lieRejoin, rj.glueExists)}%), against ${String(rj.glueExistsWrapped)} the oracle confirms`);
  say(`  THE WIDTH PROXY, which is the only wrap signal a provider could read without xterm's flag:`);
  say(`    rows filling the pane's width: ${String(rj.fullRows)} of ${String(rj.rowsTotal)} (${pct(rj.fullRows, rj.rowsTotal)}%), of which tmux says continued: ${String(rj.fullRowsContinued)} (${pct(rj.fullRowsContinued, rj.fullRows)}%)`);
  for (const [a, v] of [...rj.perAgent.entries()].sort()) {
    say(`  ${a.padEnd(8)} full-width rows ${String(v.full).padStart(6)} of which continued ${String(v.fullCont).padStart(6)} (${pct(v.fullCont, v.full)}%)`);
    say(`  ${a.padEnd(8)} row-ending spans ${String(v.edge).padStart(4)}  oracle says wrapped ${String(v.oracle).padStart(4)}  glue gains ${String(v.gain).padStart(3)}  glue resolves ${String(v.ge).padStart(3)} of which the oracle confirms ${String(v.gew).padStart(3)}  rows tmux calls wrapped ${String(v.wrappedRows).padStart(6)} of ${String(v.rows)}`);
  }

  if (process.argv.includes('--distinct')) {
    console.log('');
    say(`--- THE ${String(c.doorPaths.size)} DISTINCT PATHS BEHIND THE SPANS THAT REACH A DOOR — WORKING OUTPUT, NEVER A DOCUMENT ---`);
    for (const [k, v] of [...c.doorPaths.entries()].sort()) console.log(`${String(v).padStart(4)}\t${k}`);
  }
  if (sampleN > 0) {
    console.log('');
    say(`--- HAND ADJUDICATION SAMPLE over the spans that REACH A DOOR (${String(sample.length)} of ${String(sampleSeen)}, seed ${String(seed)}) — WORKING OUTPUT, NEVER A DOCUMENT ---`);
    sample.forEach((r, n) => {
      console.log(`${String(n + 1).padStart(3)}\t${r.agent}\t${r.inRoot ? 'in ' : 'out'}\t${r.door.replace('tortie:', '')}\t${r.text.length > 74 ? `…${r.text.slice(-73)}` : r.text.padEnd(74)}\t« ${r.context.replace(/\s+/g, ' ')}`);
    });
  }
  return 0;
}

const DIRECT = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (DIRECT) {
  if (process.argv.includes('--self-test')) process.exit(selfTest());
  else if (process.argv.includes('--fixtures')) process.exit(fixtures());
  else {
    const nAt = process.argv.indexOf('--sample');
    const sAt = process.argv.indexOf('--seed');
    process.exit(run(nAt === -1 ? 0 : Number(process.argv[nAt + 1]), sAt === -1 ? 247 : Number(process.argv[sAt + 1])));
  }
}
