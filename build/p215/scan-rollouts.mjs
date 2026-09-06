// MEASURE AGENT scan. READ ONLY over ~/.codex. Opens every file with flag 'r'.
// Writes only under the scratch directory.
import { open } from 'node:fs/promises';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, basename } from 'node:path';

const CODEX_HOME = process.env.CODEX_HOME ?? join(process.env.HOME ?? '', '.codex');
const ROOTS = [join(CODEX_HOME, 'sessions'), join(CODEX_HOME, 'archived_sessions')];
const ROLLOUT_RE =
  /^rollout-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})-([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\.jsonl(\.zst)?$/;

function walk(dir, out) {
  let ents;
  try { ents = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile()) out.push(p);
  }
}

// Mirrors stores.ts readFirstJsonLine shape: a bounded read of the head.
async function firstLine(path) {
  let fh = null;
  try {
    fh = await open(path, 'r');
    const buf = Buffer.alloc(256 * 1024);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    if (bytesRead === 0) return { err: 'empty' };
    const text = buf.subarray(0, bytesRead).toString('utf8');
    const nl = text.indexOf('\n');
    if (nl === -1) return { err: 'no-newline-in-256k' };
    try { return { doc: JSON.parse(text.slice(0, nl)) }; } catch { return { err: 'not-json' }; }
  } catch (e) { return { err: 'open:' + (e.code ?? 'x') }; }
  finally { if (fh) await fh.close().catch(() => undefined); }
}

const all = [];
for (const r of ROOTS) walk(r, all);
const rollouts = all.filter((p) => ROLLOUT_RE.test(basename(p)));
const nonRollout = all.filter((p) => !ROLLOUT_RE.test(basename(p)));

const out = [];
const CONC = 24;
let i = 0;
async function worker() {
  for (;;) {
    const k = i++;
    if (k >= rollouts.length) return;
    const p = rollouts[k];
    const m = ROLLOUT_RE.exec(basename(p));
    let st = null; try { st = statSync(p); } catch { }
    const rec = {
      path: p, fnUuid: m[7], zst: !!m[8],
      bytes: st ? st.size : null, mtime: st ? st.mtimeMs : null,
      shard: p.includes('/archived_sessions/') ? 'archived' : 'sessions',
      ym: (p.match(/\/(\d{4})\/(\d{2})\/(\d{2})\//) || []).slice(1, 4).join('-')
    };
    if (m[8]) { rec.err = 'zst'; out.push(rec); continue; }
    const { doc, err } = await firstLine(p);
    if (err) { rec.err = err; out.push(rec); continue; }
    const pay = (doc && typeof doc.payload === 'object' && doc.payload !== null) ? doc.payload : doc;
    rec.topType = doc?.type ?? null;
    rec.topKeys = Object.keys(doc ?? {});
    rec.payKeys = Object.keys(pay ?? {});
    rec.id = typeof pay?.id === 'string' ? pay.id : null;
    rec.cwd = typeof pay?.cwd === 'string' ? pay.cwd : null;
    rec.cli = pay?.cli_version ?? null;
    rec.originator = pay?.originator ?? null;
    rec.thread_source = pay?.thread_source ?? null;
    rec.session_id = pay?.session_id ?? null;
    rec.parent_thread_id = pay?.parent_thread_id ?? null;
    rec.forked_from_id = pay?.forked_from_id ?? null;
    const src = (pay && typeof pay.source === 'object' && pay.source !== null) ? pay.source : null;
    rec.sourceKeys = src ? Object.keys(src) : (pay?.source === undefined ? null : ['<' + typeof pay.source + '>']);
    const sa = src && typeof src.subagent === 'object' && src.subagent !== null ? src.subagent : null;
    rec.hasSourceSubagent = !!(src && src.subagent !== undefined);
    const ts = sa && typeof sa.thread_spawn === 'object' && sa.thread_spawn !== null ? sa.thread_spawn : null;
    rec.spawn = ts ? {
      parent_thread_id: ts.parent_thread_id ?? null, depth: ts.depth ?? null,
      agent_path: ts.agent_path ?? null, agent_nickname: ts.agent_nickname ?? null,
      keys: Object.keys(ts)
    } : null;
    out.push(rec);
  }
}
await Promise.all(Array.from({ length: CONC }, worker));
writeFileSync(process.env.P215_OUT ?? './p215-records.json', JSON.stringify(out));
console.log('files under roots:', all.length, 'rollout-shaped:', rollouts.length, 'non-rollout:', nonRollout.length);
console.log('non-rollout sample:', nonRollout.slice(0, 8));
