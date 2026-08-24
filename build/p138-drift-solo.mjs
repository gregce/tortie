/**
 * Phase 138 gate measurement 2, the control run. It writes a summary from the
 * NEWEST TURN ALONE, with no previous summary at all. If this reads the same
 * as the folded summary at the same turn, then the fold's carried history is
 * not doing any work and the version chain is buying nothing.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const dump = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const outDir = process.argv[3];
const ns = process.argv[4].split(',').map(Number);
mkdirSync(outDir + '/cwd', { recursive: true });
const SYS = 'You keep a running one line summary of a coding session, so a person can see at a glance what they have been asking that session for and where it stands. You output the summary sentence only.';
const RULES = [
  'Rules for what you write.',
  '- One or two sentences. Under 45 words in total.',
  '- Lead with the current work, which is the newest turn. Older work is mentioned only if the session is still about it.',
  '- The person is always "you". The agent is always "the agent". Neither is ever "it".',
  '- Use simple everyday words and complete sentences.',
  '- Do not use a dash of any kind. Do not use a colon.',
  '- Do not quote the ask or the answer.',
  '- Output the summary only, with no preamble and no heading.'
].join('\n');
const out = {};
for (const n of ns) {
  const t = dump.turns[n - 1];
  const prompt = [
    'Here is the newest turn of a coding session. You have no summary of what came before it.',
    '<turn>',
    'you asked:',
    (t.ask || '').trim() || '(nothing recorded)',
    '',
    'the agent answered:',
    (t.answer || '').trim() || '(no closing answer recorded)',
    '</turn>',
    '',
    'Write the summary.',
    '',
    RULES
  ].join('\n');
  const started = Date.now();
  const r = spawnSync('claude', ['-p', '--model', 'haiku', '--output-format', 'json', '--system-prompt', SYS,
    '--tools', '', '--disable-slash-commands', '--exclude-dynamic-system-prompt-sections',
    '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}'],
    { input: prompt, cwd: outDir + '/cwd', encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, DISABLE_PROMPT_CACHING: '1', MAX_THINKING_TOKENS: '0' } });
  const wall = Date.now() - started;
  const j = JSON.parse(r.stdout);
  out[n] = { n, summary: String(j.result).trim(), wall_ms: wall, cost: j.total_cost_usd };
  appendFileSync(outDir + '/ledger.jsonl', JSON.stringify({ run: 'N', tag: 'N:solo:' + n, wall_ms: wall, cost_usd: j.total_cost_usd, prompt_chars: prompt.length }) + '\n');
  process.stderr.write('solo ' + n + ' ' + wall + 'ms $' + j.total_cost_usd + '\n');
}
writeFileSync(outDir + '/N-state.json', JSON.stringify(out, null, 1));
