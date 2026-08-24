/**
 * Phase 138 gate measurement 2, the fold drift lab.
 *
 * It folds a real session one turn at a time through the person's own claude
 * CLI, and at named checkpoints it also writes one full summary of everything
 * up to that point. Fold and full see the same bytes and are given the same
 * rules, so the two summaries are comparable.
 *
 * It launches no Electron and starts no tmux server. It spawns the claude CLI
 * as a one shot process, which is the only network path Phase 138 allows. Every
 * invocation is written to a ledger with its wall clock and its reported cost.
 */
import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const i = a.indexOf('=');
    return i < 0 ? [a.replace(/^--/, ''), 'true'] : [a.slice(2, i), a.slice(i + 1)];
  })
);

const dumpFile = args.dump;
const outDir = args.out;
const from = Number(args.from ?? '0');
const to = Number(args.to ?? '200');
const checkpoints = String(args.checkpoints ?? '5,10,25,50,100,200').split(',').map(Number);
const runId = args.run ?? 'run';
const model = args.model ?? 'haiku';
const mode = args.mode ?? 'both';

mkdirSync(outDir, { recursive: true });
mkdirSync(outDir + '/cwd', { recursive: true });
const ledgerFile = outDir + '/ledger.jsonl';

const style = args.style ?? 'recency';

const RULES_RECENCY = [
  'Rules for what you write.',
  '- One or two sentences. Under 45 words in total.',
  '- Lead with the current work, which is the newest turn. Older work is mentioned only if the session is still about it.',
  '- The person is always "you". The agent is always "the agent". Neither is ever "it".',
  '- Use simple everyday words and complete sentences.',
  '- Do not use a dash of any kind. Do not use a colon.',
  '- Do not quote the ask or the answer.',
  '- Output the summary only, with no preamble and no heading.'
].join('\n');

const RULES_CUMULATIVE = [
  'Rules for what you write.',
  '- One or two sentences. Under 45 words in total.',
  '- Cover what this session has been about overall, from its first turn to its newest one.',
  '- The person is always "you". The agent is always "the agent". Neither is ever "it".',
  '- Use simple everyday words and complete sentences.',
  '- Do not use a dash of any kind. Do not use a colon.',
  '- Do not quote the ask or the answer.',
  '- Output the summary only, with no preamble and no heading.'
].join('\n');

const RULES = style === 'cumulative' ? RULES_CUMULATIVE : RULES_RECENCY;

const SYS =
  'You keep a running one line summary of a coding session, so a person can see at a glance what they have been asking that session for and where it stands. You output the summary sentence only.';

function turnBlock(t) {
  const ask = (t.ask || '').trim();
  const ans = (t.answer || '').trim();
  return [
    '<turn>',
    'you asked:',
    ask || '(nothing recorded)',
    '',
    'the agent answered:',
    ans || '(no closing answer recorded)',
    '</turn>'
  ].join('\n');
}

function callClaude(prompt, tag) {
  const started = Date.now();
  const r = spawnSync(
    'claude',
    [
      '-p',
      '--model', model,
      '--output-format', 'json',
      '--system-prompt', SYS,
      '--tools', '',
      '--disable-slash-commands',
      '--exclude-dynamic-system-prompt-sections',
      '--strict-mcp-config',
      '--mcp-config', '{"mcpServers":{}}'
    ],
    {
      input: prompt,
      cwd: outDir + '/cwd',
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, DISABLE_PROMPT_CACHING: '1', MAX_THINKING_TOKENS: '0' }
    }
  );
  const wall = Date.now() - started;
  let j = null;
  try {
    j = JSON.parse(r.stdout);
  } catch {
    j = null;
  }
  const row = {
    run: runId,
    tag,
    wall_ms: wall,
    ok: !!j && !j.is_error,
    cost_usd: j ? j.total_cost_usd : null,
    api_ms: j ? j.duration_api_ms : null,
    in_tokens: j ? j.usage.input_tokens : null,
    cache_create: j ? j.usage.cache_creation_input_tokens : null,
    cache_read: j ? j.usage.cache_read_input_tokens : null,
    out_tokens: j ? j.usage.output_tokens : null,
    prompt_chars: prompt.length,
    stderr: j ? null : String(r.stderr || '').slice(0, 400)
  };
  appendFileSync(ledgerFile, JSON.stringify(row) + '\n');
  if (!j) throw new Error('claude failed for ' + tag + ': ' + String(r.stderr).slice(0, 300));
  return { text: String(j.result || '').trim(), row };
}

const dump = JSON.parse(readFileSync(dumpFile, 'utf8'));
const turns = dump.turns.slice(from, to);

const state = { folded: [], full: {} };
const stateFile = outDir + '/' + runId + '-state.json';
if (existsSync(stateFile)) Object.assign(state, JSON.parse(readFileSync(stateFile, 'utf8')));

function save() {
  writeFileSync(stateFile, JSON.stringify(state, null, 1));
}

if (mode === 'fold' || mode === 'both') {
  let prev = state.folded.length ? state.folded[state.folded.length - 1].summary : null;
  for (let i = state.folded.length; i < turns.length; i++) {
    const t = turns[i];
    const n = i + 1;
    const prompt = prev
      ? [
          'Here is the summary as it stood after the previous turn.',
          '<previous>',
          prev,
          '</previous>',
          '',
          'Here is the one new turn since then.',
          turnBlock(t),
          '',
          style === 'cumulative'
        ? 'Write the updated summary of the whole session so far.'
        : 'Write the updated summary, covering the session as a whole with the newest turn leading.',
          '',
          RULES
        ].join('\n')
      : [
          'Here is the first turn of the session.',
          turnBlock(t),
          '',
          'Write the summary.',
          '',
          RULES
        ].join('\n');
    const { text, row } = callClaude(prompt, runId + ':fold:' + n);
    state.folded.push({ n, absIndex: from + i, summary: text, wall_ms: row.wall_ms, cost: row.cost_usd });
    prev = text;
    save();
    process.stderr.write('fold ' + n + '/' + turns.length + ' ' + row.wall_ms + 'ms $' + row.cost_usd + '\n');
  }
}

if (mode === 'full' || mode === 'both') {
  for (const n of checkpoints) {
    if (n > turns.length) continue;
    if (state.full[n]) continue;
    const blocks = turns.slice(0, n).map(turnBlock).join('\n\n');
    const prompt = [
      'Here is the whole session so far, every turn in order, oldest first.',
      blocks,
      '',
      style === 'cumulative'
        ? 'Write the summary of the whole session.'
        : 'Write the summary, covering the session as a whole with the newest turn leading.',
      '',
      RULES
    ].join('\n');
    const { text, row } = callClaude(prompt, runId + ':full:' + n);
    state.full[n] = { n, summary: text, wall_ms: row.wall_ms, cost: row.cost_usd, prompt_chars: row.prompt_chars };
    save();
    process.stderr.write('full ' + n + ' ' + row.wall_ms + 'ms $' + row.cost_usd + '\n');
  }
}

save();
console.log(JSON.stringify({ run: runId, folded: state.folded.length, fulls: Object.keys(state.full) }));
