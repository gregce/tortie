'use strict';
// Research 63. Finds real session logs on this machine. READ ONLY. Nothing is copied,
// nothing is written, nothing under the person's home is opened for writing.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const H = os.homedir();

function walk(root, match, out = [], depth = 0) {
  let ents; try { ents = fs.readdirSync(root, { withFileTypes: true }); } catch { return out; }
  for (const e of ents) {
    const p = path.join(root, e.name);
    if (e.isDirectory()) { if (depth < 8) walk(p, match, out, depth + 1); }
    else if (e.isFile() && match(p, e.name)) { try { out.push({ file: p, size: fs.statSync(p).size }); } catch {} }
  }
  return out;
}
const bySize = (a) => a.sort((x, y) => y.size - x.size);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/;

const SOURCES = {
  claude: () => bySize(walk(path.join(H, '.claude/projects'), (p, n) => uuid.test(n))),
  codex: () => bySize(walk(path.join(H, '.codex/sessions'), (p, n) => n.startsWith('rollout-') && n.endsWith('.jsonl'))),
  grok: () => bySize(walk(path.join(H, '.grok/sessions'), (p, n) => n === 'updates.jsonl')),
  antigravity: () => bySize(walk(path.join(H, '.gemini/antigravity-cli/brain'), (p, n) => n === 'transcript_full.jsonl')),
  muse: () => bySize(walk(path.join(H, '.local/share/muse/sessions'), (p, n) => n === 'session.jsonl' && !p.includes('/subagent/'))
    .map((f) => ({ ...f, sessionId: path.basename(path.dirname(f.file)) }))),
  qwen: () => bySize(walk(path.join(H, '.qwen/projects'), (p, n) => p.includes('/chats/') && n.endsWith('.jsonl') && !p.includes('/subagents/'))),
  pi: () => bySize(walk(path.join(H, '.pi/agent/sessions'), (p, n) => n.endsWith('.jsonl'))),
  gemini: () => bySize(walk(path.join(H, '.gemini/tmp'), (p, n) => p.includes('/chats/') && n.endsWith('.jsonl'))),
  deepseek: () => bySize(walk(path.join(H, '.deepseek/sessions'), (p, n) => n.endsWith('.json'))),
  copilotide: () => bySize(walk(path.join(H, 'Library/Application Support/Code/User/workspaceStorage'), (p) => p.includes('/chatSessions/'))),
  cursor: () => bySize(walk(path.join(H, '.cursor/chats'), (p, n) => n === 'store.db')
    .map((f) => ({ ...f, sessionId: path.basename(path.dirname(f.file)) }))),
  droid: () => [],
};

module.exports = { SOURCES, walk };
