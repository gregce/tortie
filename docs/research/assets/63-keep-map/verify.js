'use strict';
// Research 63. Runs every fixture through the reader and asserts the slots.
// This is the shape `npm run conformance:overview` needs in Phase 137.
//   node verify.js
const fs = require('node:fs');
const path = require('node:path');
const { readSession, MAP } = require('./read');
const fixtures = require('./lib/fixtures');

const F = path.join(__dirname, '..', '63-fixtures');
const CASES = [
  { p: 'claude', file: 'claude-session.jsonl', turns: 3, answers: 3, banned: ['task-notification', 'This session is being continued', 'Another Claude session', 'local-command-stdout', 'session limit'] },
  { p: 'codex', file: 'codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl', turns: 3, answers: 3, banned: ['<environment_context>', 'AGENTS.md instructions', 'codex_internal_context', 'turn_aborted', 'attachments/'] },
  { p: 'grok', file: 'grok-updates.jsonl', turns: 3, answers: 3, banned: ['system-reminder', 'Background subagent'] },
  { p: 'antigravity', file: 'antigravity-transcript_full.jsonl', turns: 3, answers: 2, banned: ['ADDITIONAL_METADATA', 'USER_SETTINGS_CHANGE', 'Created At:', 'CHECKPOINT', 'not actually sent by the user'] },
  { p: 'qwen', file: 'qwen-chat.jsonl', turns: 4, answers: 4, banned: ['task-notification', '<state_snapshot>', 'functionResponse'] },
  { p: 'pi', file: 'pi-sessions--Users-example-rookery--/2026-06-12T04-57-36-108Z_019eba31-566c-7911-bf09-14afe53d7c36.jsonl', turns: 2, answers: 2, banned: ['Please rewrite the whole module', 'Checking the size now.'] },
  { p: 'muse', file: 'muse-sessions/2026/08/18/0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c/session.jsonl', sessionId: '0cd2aa28-b1ee-4cfb-aeba-ac10edf4eb6c', turns: 2, answers: 2, banned: ['Role: demo-worker', 'Let me list them.'] },
  { p: 'gemini', file: 'gemini-session-2026-08-20T10-00-a1b2c3d4.jsonl', turns: 3, answers: 3, banned: ['<session_context>', 'Content from referenced files', 'Update successful'] },
  { p: 'deepseek', file: 'deepseek-session.json', turns: 3, answers: 1, banned: ['<turn_meta>', 'Path escapes workspace'] },
  { p: 'cursor', adapter: 'cursor', file: 'cursor-store.json', turns: 3, answers: 2, banned: ['<user_info>', 'Looking at the workspace'] },
  { p: 'cursoride', adapter: 'cursoride', file: 'cursoride-composer.json', turns: 3, answers: 3, banned: ['Base directory for this skill', 'Request interrupted by user', '<tool-use>'] },
  { p: 'copilotide', adapter: 'copilotide', file: 'copilotide-chatsession.json', turns: 2, answers: 2, banned: ['renderedUserMessage', 'toolCallResults'] },
  { p: 'droid', absent: true },
];

let fail = 0;
const rows = [];
for (const c of CASES) {
  if (c.absent) {
    const r = readSession({ provider: c.p, file: null });
    const ok = r.turns.length === 0 && !!r.honest;
    rows.push([c.p, 'honest line', ok ? 'pass' : 'FAIL', '']); if (!ok) fail++;
    continue;
  }
  let file = path.join(F, c.file), sid = c.sessionId || null, cleanup = null;
  if (c.adapter) { const a = fixtures[c.adapter](file); file = a.file; sid = a.sessionId || sid; cleanup = a.dir; }
  let r, err = '';
  try { r = readSession({ provider: c.p, file, sessionId: sid }); } catch (e) { err = e.message; }
  if (cleanup) fs.rmSync(cleanup, { recursive: true, force: true });
  if (!r) { rows.push([c.p, '-', 'FAIL', err]); fail++; continue; }
  const answers = r.turns.filter((t) => t.answer).length;
  const all = r.turns.map((t) => t.ask.text + '\n' + (t.answer ? t.answer.text : '')).join('\n');
  const leaked = (c.banned || []).filter((b) => all.includes(b));
  const problems = [];
  if (r.turns.length !== c.turns) problems.push(`turns ${r.turns.length} want ${c.turns}`);
  if (answers !== c.answers) problems.push(`answers ${answers} want ${c.answers}`);
  if (leaked.length) problems.push('trap leaked: ' + leaked.join(', '));
  const slots = [r.turns.length ? 'ask' : '', answers ? 'answer' : '', r.turns.length ? 'boundary' : '', r.join && (r.join.sessionId || r.join.file) ? 'join' : '', r.watermark ? 'watermark' : ''].filter(Boolean).join(' ');
  rows.push([c.p, `${r.turns.length} turns, ${answers} answers`, problems.length ? 'FAIL' : 'pass', problems.length ? problems.join('; ') : slots]);
  if (problems.length) fail++;
}

const w = [12, 22, 6, 60];
console.log('Research 63 keep map, per provider slot matrix\n');
console.log(['agent', 'result', 'verdict', 'slots filled / why'].map((s, i) => s.padEnd(w[i])).join(''));
console.log(w.map((n) => '-'.repeat(n - 1)).join(' '));
for (const r of rows) console.log(r.map((s, i) => String(s).padEnd(w[i])).join(''));
console.log(`\nmapped providers in keep-map.json: ${Object.values(MAP.providers).filter((p) => p.container !== 'none').length} of ${Object.keys(MAP.providers).length}`);
console.log(fail ? `\nFAIL: ${fail} provider(s)` : '\nPASS: every mapped provider fills every slot and leaks no trap');
process.exit(fail ? 1 : 0);
