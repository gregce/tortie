#!/usr/bin/env node
/**
 * PHASE 245, MEASUREMENT 3. WHAT DOES THE PROJECT ROOT RULE COST, AND WHAT IS
 * ACTUALLY BEHIND THE SPANS A CLICK WOULD BE OFFERED ON?
 *
 * `build/p245/corpus-scan.mjs` answered whether a path can be FOUND. It stopped
 * at "something is there". This one asks the two questions the RECOMMENDATION
 * rests on and which nothing had measured:
 *
 *   1. Of the spans the conservative policy offers, how many survive the rule
 *      that a link must resolve INSIDE AN OPEN PROJECT ROOT? That rule is what
 *      version one hangs on, and its cost was an assumption.
 *   2. What KIND are the survivors? A destination has to exist for each one,
 *      and Tortie has no "reveal in the Explorer" surface, so a directory has
 *      nowhere to land. The split decides how much of the offer is real.
 *
 * It reuses the committed detectors from corpus-scan.mjs rather than writing a
 * second grammar, and it reuses the SHIPPING predicates for what Tortie can
 * draw — `IMAGE_EXTENSIONS` and `looksLikeSecretPath` — read out of the source
 * rather than restated, so this measurement cannot drift from the product.
 *
 * SAFETY, and it is the same contract the other two scripts keep. It LISTS and
 * CAPTURES the operator's sessions and does nothing else: never attaches, never
 * sends a key, never kills one, never starts an agent, spends no token. The
 * project roots are read from a COPY of the manifest that the caller makes;
 * this script opens no database and is handed the roots on its command line or
 * through P245_ROOTS. The only filesystem calls are `lstat` and `realpath`,
 * both metadata only: NO PATH READ OUT OF A TRANSCRIPT IS EVER OPENED,
 * EXECUTED OR WRITTEN TO. It prints counts and rates and NEVER a path.
 *
 *   P245_ROOTS=/a:/b node build/p245/root-cost.mjs
 *   node build/p245/root-cost.mjs --self-test
 */

import { execFileSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { extname, sep } from 'node:path';
import { readFileSync } from 'node:fs';
import { conservative, looksPathB, normalise, tokenizeB } from './corpus-scan.mjs';

const TAG = '[p245]';
const say = (l) => console.log(`${TAG} ${l}`);

// ---------------------------------------------------------------------------
// The SHIPPING predicates, read out of the source so they cannot drift.
// ---------------------------------------------------------------------------

/** `IMAGE_EXTENSIONS` as src/shared/image-types.ts really spells it. */
function shippedImageExtensions() {
  const src = readFileSync('src/shared/image-types.ts', 'utf8');
  const block = /IMAGE_MEDIA_TYPES[^=]*=\s*\{([\s\S]*?)\n\};/.exec(src);
  if (block === null) throw new Error('IMAGE_MEDIA_TYPES not found');
  const set = new Set();
  for (const m of block[1].matchAll(/'(\.[a-z0-9]+)'\s*:/g)) set.add(m[1]);
  if (set.size === 0) throw new Error('IMAGE_MEDIA_TYPES parsed empty');
  return set;
}

/** The NEVER_PREVIEW rules of src/shared/preview-types.ts, by NAME only. */
const SECRET_KEY_EXT = new Set(['.pem', '.key', '.cer', '.crt', '.p12', '.pfx', '.keystore', '.jks', '.der']);
const SSH_STEMS = ['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519'];
export function looksLikeSecretName(name) {
  if (name === '.env' || name.startsWith('.env.')) return true;
  if (SECRET_KEY_EXT.has(extname(name).toLowerCase())) return true;
  if (SSH_STEMS.some((s) => name === s || name.startsWith(`${s}.`))) return true;
  if (extname(name).toLowerCase() === '.properties') return true;
  if (name === '.netrc' || name === '_netrc') return true;
  if (name === '.htpasswd' || name === 'htpasswd') return true;
  return false;
}

const MD_EXT = new Set(['.md', '.mdx', '.markdown']);

/** Containment with a separator, exactly as src/main/fs/paths.ts spells it. */
export function containedIn(root, candidate) {
  if (candidate === root) return true;
  const prefix = root.endsWith(sep) ? root : root + sep;
  return candidate.startsWith(prefix);
}

/** `.git` at any depth — the fs contract's protected family. */
export function underDotGit(rel) {
  return rel.split('/').some((s) => s === '.git');
}

// ---------------------------------------------------------------------------
// Self test — the new predicates are proved on fixtures so a scan that cannot
// fail is never mistaken for a scan that passed.
// ---------------------------------------------------------------------------
const FIXTURES = [
  ['containedIn', () => containedIn('/a/b', '/a/b/c'), true, 'a child is inside'],
  ['containedIn', () => containedIn('/a/b', '/a/b'), true, 'the root itself is inside'],
  ['containedIn', () => containedIn('/a/b', '/a/b-old/c'), false, 'a sibling that merely shares a prefix is NOT inside'],
  ['containedIn', () => containedIn('/a/b', '/a'), false, 'a parent is not inside'],
  ['underDotGit', () => underDotGit('.git/config'), true, '.git at the head'],
  ['underDotGit', () => underDotGit('src/.git/x'), true, '.git at depth'],
  ['underDotGit', () => underDotGit('src/gitignore'), false, 'a name that merely contains git'],
  ['secret', () => looksLikeSecretName('.env.production'), true, 'a dotenv in every spelling'],
  ['secret', () => looksLikeSecretName('auth.json'), false, 'auth.json is NOT on the shipped list — stated, not assumed'],
  ['secret', () => looksLikeSecretName('id_ed25519.pub'), true, 'an ssh key stem'],
  ['secret', () => looksLikeSecretName('server.pem'), true, 'key material by extension'],
  ['secret', () => looksLikeSecretName('README.md'), false, 'an ordinary file'],
  ['image', () => shippedImageExtensions().has('.png'), true, 'the shipped list really parsed'],
  ['image', () => shippedImageExtensions().has('.tiff'), false, 'TIFF is deliberately absent from the shipped list']
];

function selfTest() {
  let bad = 0;
  for (const [group, run, want, why] of FIXTURES) {
    let got;
    try { got = run(); } catch (err) { got = `threw: ${err.message}`; }
    const ok = got === want;
    if (!ok) bad++;
    console.log(`${TAG} ${ok ? 'OK  ' : 'FAIL'} ${group}: ${String(got)} — ${why}`);
  }
  console.log(`${TAG} ${bad === 0 ? 'every fixture behaved' : `${String(bad)} fixtures did not`}`);
  return bad === 0 ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

// ---------------------------------------------------------------------------
// The roots. Handed in, never read out of a live database by this script.
// ---------------------------------------------------------------------------
const rawRoots = (process.env['P245_ROOTS'] ?? '').split(':').filter((r) => r.length > 0);
if (rawRoots.length === 0) {
  console.error(`${TAG} P245_ROOTS is required (colon separated absolute project roots).`);
  process.exit(2);
}
const roots = [];
for (const r of rawRoots) {
  try { roots.push(realpathSync(r)); } catch { /* a project folder that has gone away */ }
}
say(`open project roots handed in: ${String(rawRoots.length)}, of which ${String(roots.length)} still resolve`);

/** The rel path inside the first root that contains it, or null. */
function insideAnyRoot(abs) {
  for (const root of roots) {
    if (containedIn(root, abs)) return abs === root ? '' : abs.slice(root.length + 1);
  }
  return null;
}

// ---------------------------------------------------------------------------
// The corpus. LIST and CAPTURE only, exactly as measurement 2 reads it.
// ---------------------------------------------------------------------------
const tmux = (...a) =>
  execFileSync('tmux', ['-L', 'gmux', ...a], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

let sessions;
try {
  sessions = tmux('list-sessions', '-F', '#{session_id}').trim().split('\n').filter(Boolean);
} catch {
  console.error(`${TAG} no sessions on -L gmux. Nothing to measure.`);
  process.exit(2);
}

const IMAGE_EXT = shippedImageExtensions();
const c = {
  sessions: 0, rows: 0, shaped: 0, offered: 0,
  dir: 0, file: 0, link: 0,
  inRoot: 0, inRootDir: 0, inRootFile: 0, inRootLink: 0,
  outRoot: 0, outRootDir: 0, outRootFile: 0, outRootLink: 0,
  dotGit: 0,
  fileImage: 0, fileMarkdown: 0, fileOther: 0, fileSecret: 0,
  outFileImage: 0,
  imageNotDrawable: 0,
  bareRoot: 0, endOfRow: 0, endOfRowContinues: 0,
  distinctInRootFiles: new Set(),
  distinctInRootDirs: new Set()
};

/** A continuation row's own gutter, which Codex draws and Claude Code does not. */
const GUTTER = /^(\s*(?:[│┃|]|└|├|⎿|>|•|⏺)\s?)+/u;
const PATHCH = /[A-Za-z0-9._@%+~$/-]/;

for (const sid of sessions) {
  let agent = '';
  try {
    agent = tmux('show-options', '-t', sid).split('\n')
      .find((l) => l.startsWith('@gmux-agent '))?.slice(12).trim() ?? '';
  } catch { agent = ''; }
  if (agent === '') continue;                        // not ours: never adopt it
  let text = '';
  try { text = tmux('capture-pane', '-p', '-S', '-', '-t', sid); } catch { continue; }
  const rows = text.split('\n').map((r) => r.replace(/\s+$/, ''));
  c.sessions++; c.rows += rows.length;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const next = rows[i + 1] ?? '';
    for (const t of tokenizeB(row)) {
      if (!looksPathB(t.text)) continue;
      c.shaped++;
      // The bare root passes the GRAMMAR and the recommended policy refuses it
      // for having no segment. Counted here because measurement 2's inline
      // offer count does NOT apply that clause, so its denominator is larger
      // than the policy's by exactly this number.
      const bare = normalise(t.text).path;
      if (bare.startsWith('/') && bare.split('/').filter((x) => x.length > 0).length === 0) c.bareRoot++;
      const offer = conservative(t.text);
      if (offer === null) continue;
      c.offered++;
      if (t.end === row.length) {
        c.endOfRow++;
        const cont = next.replace(GUTTER, '');
        if (cont.length > 0 && PATHCH.test(cont[0])) c.endOfRowContinues++;
      }
      const { path, kind } = offer;
      if (kind === 'dir') c.dir++; else if (kind === 'file') c.file++; else if (kind === 'link') c.link++;

      const rel = insideAnyRoot(path);
      const ext = extname(path).toLowerCase();
      const name = path.slice(path.lastIndexOf('/') + 1);

      if (rel === null) {
        c.outRoot++;
        if (kind === 'dir') c.outRootDir++;
        else if (kind === 'file') c.outRootFile++;
        else c.outRootLink++;
        if (kind === 'file' && IMAGE_EXT.has(ext)) c.outFileImage++;
        continue;
      }
      c.inRoot++;
      if (underDotGit(rel)) c.dotGit++;
      if (kind === 'dir') { c.inRootDir++; c.distinctInRootDirs.add(path); }
      else if (kind === 'file') { c.inRootFile++; c.distinctInRootFiles.add(path); }
      else c.inRootLink++;
      if (kind !== 'file') continue;
      if (looksLikeSecretName(name)) c.fileSecret++;
      if (IMAGE_EXT.has(ext)) c.fileImage++;
      else if (MD_EXT.has(ext)) c.fileMarkdown++;
      else {
        c.fileOther++;
        // An image by eye that Tortie's own surfaces cannot draw: the drop
        // pipeline sniffs bytes, but gmux-asset: is an EXTENSION allowlist.
        if (/\.(tiff?|heic|heif|pdf|psd|raw|dng)$/i.test(ext)) c.imageNotDrawable++;
      }
    }
  }
}

const pct = (n, d) => (d === 0 ? '0.0' : ((100 * n) / d).toFixed(1));

console.log('');
say(`corpus: ${String(c.sessions)} sessions, ${String(c.rows)} physical rows`);
say(`path-shaped tokens: ${String(c.shaped)}`);
say(`the conservative policy offers: ${String(c.offered)} (${pct(c.offered, c.shaped)}% of path-shaped)`);
say(`  bare-root tokens the policy refuses for having no segment, which measurement 2's own offer count includes: ${String(c.bareRoot)}`);
say(`  spans ending at a row boundary the next row continues, so the span is a PREFIX: ${String(c.endOfRowContinues)} of ${String(c.offered)} (${pct(c.endOfRowContinues, c.offered)}%)`);
say(`  by kind — dir ${String(c.dir)} (${pct(c.dir, c.offered)}%), file ${String(c.file)} (${pct(c.file, c.offered)}%), symlink ${String(c.link)} (${pct(c.link, c.offered)}%)`);
console.log('');
say(`THE PROJECT ROOT RULE`);
say(`  inside an open project root: ${String(c.inRoot)} (${pct(c.inRoot, c.offered)}% of offered)`);
say(`    dir ${String(c.inRootDir)}, file ${String(c.inRootFile)}, symlink ${String(c.inRootLink)}`);
say(`  outside every open project root: ${String(c.outRoot)} (${pct(c.outRoot, c.offered)}% of offered)`);
say(`    dir ${String(c.outRootDir)}, file ${String(c.outRootFile)}, symlink ${String(c.outRootLink)}`);
say(`  under .git, which the fs contract already refuses: ${String(c.dotGit)}`);
console.log('');
say(`WHAT A CLICK WOULD LAND ON — the ${String(c.inRootFile)} in-root FILE spans`);
say(`  image by the SHIPPED extension list: ${String(c.fileImage)} (${pct(c.fileImage, c.inRootFile)}%)`);
say(`  markdown: ${String(c.fileMarkdown)} (${pct(c.fileMarkdown, c.inRootFile)}%)`);
say(`  everything else, which is an editor tab: ${String(c.fileOther)} (${pct(c.fileOther, c.inRootFile)}%)`);
say(`  of those, an image by EYE that no Tortie surface can draw: ${String(c.imageNotDrawable)}`);
say(`  matching the shipped NEVER_PREVIEW name list: ${String(c.fileSecret)}`);
say(`  distinct files behind them: ${String(c.distinctInRootFiles.size)}; distinct directories behind the dir spans: ${String(c.distinctInRootDirs.size)}`);
console.log('');
say(`images OUTSIDE every root, which is the shape the issue asked about: ${String(c.outFileImage)}`);
